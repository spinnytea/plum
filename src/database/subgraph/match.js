'use strict';
const _ = require('lodash');
const bluebird = require('bluebird');
const subgraph = require('../subgraph');

module.exports = exports = match;

Object.defineProperty(exports, 'units', { value: {} });
exports.units.match = match;
exports.units.recursiveMatch = recursiveMatch;
// exports.units.SubgraphMatchMetadata = SubgraphMatchMetadata; // hooked up below the class XXX will this ever be mocked? does it need to be
exports.units.initializeVertexMap = initializeVertexMap;
exports.units.getOuterVertexIdFn = getOuterVertexIdFn;
exports.units.vertexTransitionableAcceptable = vertexTransitionableAcceptable;
exports.units.filterOuter = filterOuter;
exports.units.getMatchData = getMatchData;
exports.units.vertexFixedMatch = vertexFixedMatch;

/**
 * find a list of ways to map the inner subgraph onto the outer subgraph
 * returns a set of mapped edges and vertices
 *
 * this doesn't follow any particular algorithm
 * it picks the "best" inner edge, and finds all matching outer edges
 * it repeats that until all the inner edges have been address
 *
 * @param outer - subgraph, must be concrete
 * @param inner - subgraph, the one we are trying to find within outer
 * @param unitsOnly - specific to transitionable vertices
 *  - when we need to see if a transition is possible, the match needs to see if we can combine the values
 *  - it's primarily used to find the distance between two states
 *  - it's primarily used to see if a goal state can be reached
 */
function match(outer, inner, unitsOnly) {
  if(!outer.concrete)
    throw new RangeError('the outer subgraph must be concrete before you can match against it');

  if(inner._vertexCount === 0)
    return Promise.resolve([]);

  // the inner must fit a subset of outer
  // if the inner is larger, then this is impossible
  if(inner._vertexCount > outer._vertexCount || inner._edgeCount > outer._edgeCount)
    return Promise.resolve([]);

  // ensure it's a boolean
  // this is also to prove that the default value should be false (we need to specifically opt-in for true)
  unitsOnly = (unitsOnly === true);

  return exports.units.initializeVertexMap(outer, inner, unitsOnly).then(function(vertexMap) {
    // if vertexMap doesn't exist, then there is no match
    if(!vertexMap) return [];

    // recurse over the edges
    return exports.units.recursiveMatch(exports.units.SubgraphMatchMetadata(outer, inner, vertexMap, unitsOnly));
  });
}

/**
 * match is the seed for the recursive function, this is the recursive case
 *
 * find an edge to expand, then expand it
 */
function recursiveMatch(metadata) {
  // are we done?
  if(metadata.innerEdges.length === 0) {
    if(metadata.vertexMap.size === metadata.inner._vertexCount)
      return Promise.resolve([metadata.vertexMap]);
    return Promise.resolve([]);
  }

  // pick the best inner edge
  // (this helps us reduce the number of branches)
  const innerEdge = metadata.innerEdges.reduce(function(prev, curr) {
    if(prev === null || curr.options.pref > prev.options.pref && metadata.skipThisTime.has(curr))
      return curr;
    return prev;
  }, null);

  // find all matching outer edges
  return Promise.all(metadata.getOuterEdges(innerEdge).map(function(outerEdge) {
    return exports.units.filterOuter(metadata, outerEdge, innerEdge);
  })).then(function(matches) {
    // clear the list of unmatched edges
    return matches.filter(_.identity);
  }).then(function(matches) {
    // 0 outer
    // - deal with vertex.options.pointer
    // - otherwise return no match
    if(matches.length === 0) {
      const innerSrcMatch = metadata.inner.getMatch(innerEdge.src);
      const innerDstMatch = metadata.inner.getMatch(innerEdge.dst);

      // because of indirection, we may need to skip an edge and try the next best one
      // so if our current edge uses inderection, and there are other edges to try, then, well, try again
      // but next time, don't consider this edge
      if((innerSrcMatch.options.pointer || innerDstMatch.options.pointer) && metadata.innerEdges.length > metadata.skipThisTime.size) {
        metadata.skipThisTime.push(innerEdge);
        return exports.units.recursiveMatch(metadata);
      }

      // no matches, and we've skipped everything
      return [];
    }

    // common stuff before recursion
    // - note that when we do the many case, we don't need to do this for all the clones #winning
    metadata.removeInnerEdge(innerEdge);

    // 1 outer
    // - reuse metadata
    // - recurse
    if(matches.length === 1) {
      const outerEdge = matches[0];
      metadata.removeOuterEdge(outerEdge);
      metadata.updateVertexMap(innerEdge, outerEdge);
      metadata.skipThisTime.clear();
      return exports.units.recursiveMatch(metadata);
    }

    // + outer
    // - loop over matches
    // - clone metadata
    // - recurse
    return Promise.all(matches.map(function(outerEdge) {
      const meta = metadata.clone(); // XXX don't clone if it's the last match
      meta.removeOuterEdge(outerEdge);
      meta.updateVertexMap(innerEdge, outerEdge);
      return exports.units.recursiveMatch(meta);
    })).then(_.flatten);
  });
}


/**
 * an object containing state info for the subgraph match
 * it's a complicated process with a lot of parameters, so it's nice to have them packaged up
 * it's a complicated process, so we need to compute some indexes and caches to speed it up
 */
class SubgraphMatchMetadata {
  constructor(outer, inner, vertexMap, unitsOnly) {
    // outer subgraph (concrete, the represents the world)
    this.outer = outer;
    // inner subgraph (the one we are matching)
    this.inner = inner;
    // do we use the matcher, or just match the units?
    this.unitsOnly = unitsOnly;

    // the edges in the outer subgraph, grouped by link
    this.outerEdges = new Map();
    // a list of inner edges, will be pruned as they are validated
    this.innerEdges = inner.allEdges().slice(0);

    // vertexes we have matched so far
    this.vertexMap = vertexMap;
    // inverse map
    this.inverseMap = new Map();
    vertexMap.forEach(this.inverseMap.set);

    // edges we have mapped so far
    this.edgeMap = new Map();

    // a list of edges we are going to skip until we match our next edge
    this.skipThisTime = new Set();


    // fill outer edges, grouped by type
    outer.allEdges().forEach((edge) => {
      let list = this.outerEdges.get(edge.link.name);
      if(!list) {
        list = [];
        this.outerEdges.set(edge.link.name, list);
      }
      list.push(edge);
    });
  }
  clone() {
    // FIXME rewrite
  }
  // clone(existing, innerEdges, vertexMap, inverseMap) {
  //   // this.outer = existing.outer;
  //   // this.inner = existing.inner;
  //   // this.unitsOnly = existing.unitsOnly;
  //   //
  //   // // outer edges are consumed as we match them, copies need their own version
  //   // this.outerEdges = _.clone(existing.outerEdges);
  //   //
  //   // // XXX why are these modified outside of the metadata object
  //   // //  - they should have accessor methods
  //   // this.innerEdges = innerEdges;
  //   // this.vertexMap = vertexMap;
  //   // this.inverseMap = inverseMap;
  //   // this.skipThisTime = new Set();
  // }

  getOuterEdges(edge) {
    return this.outerEdges.get(edge.link.name) || [];
  }
  removeInnerEdge(innerEdge) {
    _.pull(this.innerEdges, innerEdge);
  }
  removeOuterEdge(outerEdge) {
    _.pull(this.outerEdges.get(outerEdge.link.name), outerEdge);
  }
  updateVertexMap(innerEdge, outerEdge) {
    this.vertexMap.set(innerEdge.src, outerEdge.src);
    this.vertexMap.set(innerEdge.dst, outerEdge.dst);
    this.inverseMap.set(outerEdge.src, innerEdge.src);
    this.inverseMap.set(outerEdge.dst, innerEdge.dst);
    this.edgeMap.set(innerEdge.id, outerEdge.id);
  }
}
exports.units.SubgraphMatchMetadata = SubgraphMatchMetadata;

/**
 * @param outer
 * @param inner
 * @param unitsOnly
 * @return a promise resolving to a map
 *  - vertexMap.get(inner vertex key) = outer vertex key;
 *  - the promise will be rejected if it's not possible
 */
function initializeVertexMap(outer, inner, unitsOnly) {
  const vertexMap = new Map();
  const innerIdeas = inner.allIdeas();
  const getOuterVertexId = exports.units.getOuterVertexIdFn(outer.allIdeas(), innerIdeas.size);

  // innerIdeas is a map, not a list, so there is no map function
  const promises = [];
  innerIdeas.forEach(function(vi_idea, vi_key) {
    const vo_key = getOuterVertexId(vi_idea.id);
    if(vo_key) {
      vertexMap.set(vi_key, vo_key);

      // vi.idea has been identified so we can use vi.data directly
      promises.push(Promise.all([
        outer.getData(vo_key),
        inner.getData(vi_key),
      ]).then(function([vo_data, vi_data]) {
        let possible = exports.units.vertexTransitionableAcceptable(
          outer.getMatch(vo_key).options.transitionable,
          vo_data,
          inner.getMatch(vi_key).options.transitionable,
          vi_data,
          unitsOnly);

        if(!possible)
          return Promise.reject();
      }));
    }
  });

  return Promise.all(promises).then(function() {
    return vertexMap;
  }, function() {
    return undefined;
  });
}

/**
 * assumption: objects are hash maps
 * ((ni+no)*log(no) vs (ni*no))
 * xlnx / (x-lnx); if ni is greater than that thing, use the index
 * otherwise, it's faster to simply search for the elements
 * this turns out to be a really small number, but ni is typically even smaller
 *
 * n is inner (wolfram alpha assume i is sqrt -1)
 * x is outer (since this is the input to our equation, I guess)
 * plot ((n+x)*log2(x)) vs (n*x) where x = 100 for n from 0 to 10
 * solve (n+x)*log2(x) = (n*x) for n
 * plot x*log(x) / (x * log(2) - log(x)) for x from 2 to 100
 *
 * @param outerIdeas - list of all outer ideas
 * @param innerCount - number of inner ideas
 * @returns {Function}
 */
function getOuterVertexIdFn(outerIdeas, innerCount) {
  const x = outerIdeas.size;
  const lnx = Math.log(x);
  if(innerCount > x*lnx / (x*Math.LN2-lnx)) {
    // build an index (outer.idea.id -> outer.vertex_id)
    const inverseOuterMap = {};
    outerIdeas.forEach(function(vo_idea, vo_key) {
      inverseOuterMap[vo_idea.id] = vo_key;
    });
    return function index(id) {
      return inverseOuterMap[id];
    };
  } else {
    // do a dumb search through the list
    return function search(id) {
      let found = null;
      // TODO is there a more elegant implementation
      outerIdeas.forEach(function(vo_idea, vo_key) { if(id === vo_idea.id) found = vo_key; });
      return found;
    };
  }
}

/**
 * this function checks transitionable vertices to see if a transition is possible
 * it should noop for non-transitionable vertices (returns true because it isn't determined to be invalid)
 */
function vertexTransitionableAcceptable(vo_transitionable, vo_data, vi_transitionable, vi_data, unitOnly) {
  // if the inner isn't transitionable, then we don't need to check anything
  if(!vi_transitionable) return true;
  // the outer must be transitionable, otherwise it's a config/matcher problem
  // the outer subgraph defines up front what values it expects to change
  if(!vo_transitionable) return false;

  // make sure we have data to work with
  if(!vo_data) return true;
  if(!vi_data) return true;

  // this might be pedantic, but it'll make thing easier later
  // they must either both HAVE or NOT HAVE a unit
  if(vo_data.hasOwnProperty('unit') !== vi_data.hasOwnProperty('unit')) return false;

  if(unitOnly) {
    // actually, this is invalid
    // we can't DO this, so we should never get here
    if(!vo_data.hasOwnProperty('unit')) return false;

    // match the units
    return vo_data.unit === vi_data.unit;
  } else {
    // XXX we need a distance function for each kind of unit, use that instead
    return _.isEqual(vo_data, vi_data);
  }
}

/**
 * check to see if the outer edge is a good match for the inner edge
 *
 * @prereq: outerEdge.link === innerEdge.link
 * @param metadata
 * @param outerEdge
 * @param innerEdge
 * @return outerEdge if we should use outer edge to expand, undefined otherwise, wrapped in a promise
 */
function filterOuter(metadata, outerEdge, innerEdge) {
  return bluebird.coroutine(function*() {
    // skip the vertices that are mapped to something different
    if(metadata.vertexMap.has(innerEdge.src)) {
      if(metadata.vertexMap.get(innerEdge.src) !== outerEdge.src)
        return undefined;
    } else {
      // outerEdge src is mapped to a different inner id
      if(metadata.inverseMap.has(outerEdge.src))
        return undefined;
    }
    if(metadata.vertexMap.has(innerEdge.dst)) {
      if(metadata.vertexMap.get(innerEdge.dst) !== outerEdge.dst)
        return undefined;
    } else {
      // outerEdge dst is mapped to a different inner id
      if(metadata.inverseMap.has(outerEdge.dst))
        return undefined;
    }

    // check the matchers against data to make sure the edge is valid
    // TODO these six values won't change while we run this algorithm
    // - cache them in metadata?
    const innerSrcMatch = metadata.inner.getMatch(innerEdge.src);
    const innerDstMatch = metadata.inner.getMatch(innerEdge.dst);
    const innerSrcData = yield exports.units.getMatchData(metadata, innerEdge.src, innerSrcMatch);
    const innerDstData = yield exports.units.getMatchData(metadata, innerEdge.dst, innerDstMatch);
    const outerSrcData = yield metadata.outer.getData(outerEdge.src);
    const outerDstData = yield metadata.outer.getData(outerEdge.dst);

    // check transitionable
    if(!exports.units.vertexTransitionableAcceptable(
        metadata.outer.getMatch(outerEdge.src).options.transitionable,
        outerSrcData,
        innerSrcMatch.options.transitionable,
        innerSrcData,
        metadata.unitsOnly))
      return undefined;
    if(!exports.units.vertexTransitionableAcceptable(
        metadata.outer.getMatch(outerEdge.dst).options.transitionable,
        outerDstData,
        innerDstMatch.options.transitionable,
        innerDstData,
        metadata.unitsOnly))
      return undefined;

    // check non-transitionable
    if(!metadata.inner.hasIdea(innerEdge.src)) {
      if(!(yield exports.units.vertexFixedMatch(innerSrcData, innerSrcMatch, metadata.outer, outerEdge.src, metadata.unitsOnly)))
        return undefined;
    }
    if(!metadata.inner.hasIdea(innerEdge.dst)) {
      if(!(yield exports.units.vertexFixedMatch(innerDstData, innerDstMatch, metadata.outer, outerEdge.dst, metadata.unitsOnly)))
        return undefined;
    }

    return outerEdge;
  })().catch(function() {
    // if there was a problem, just count it as a miss
    return undefined;
  });
}

/**
 * we need to find the match data since it could be in a few places
 * this is thanks to match.options.pointer
 * without pointers, it would just be the first return
 *
 * XXX rename getMatchData, it's kind of misleading; "matchData" means "match.data" and that's not what this does
 */
function getMatchData(metadata, vi_key, innerMatch) {
  // if this is not a pointer, then we use the data at this vertex
  // if it already is mapped, then use the data at this vertex
  if(!innerMatch.options.pointer || metadata.inner.hasIdea(vi_key))
    return metadata.inner.getData(vi_key);

  // if this is a pointer...
  // (and doesn't have and idea mapped)

  // if our inner graph has a value cached for the target, use that
  let data = metadata.inner.getData(innerMatch.data); // FIXME this is a promise
  if(data)
    return data;

  // if we have already mapped the target vertex, then use the outer data
  // (mapped, but the inner hasn't been updated with the idea data)
  // (note: we may not have mapped the pointer target by this point, and that's okay)
  let vo_key = metadata.vertexMap.get(innerMatch.data);
  if(vo_key)
    return metadata.outer.getData(vo_key);

  // we can't find data to use (this is okay)
  return Promise.resolve(null);
}

/**
 * check the matcher function against the outer data
 * this should only be called if the inner idea has not been identified
 *
 * if a vertex is not marked as transitionable
 * or if we are not checking unit only
 * then we need a harder check on the value
 *
 * XXX rename vertexFixedMatch; it's not very expressive; it contrasts 'vertexTransitionableAcceptable', but doesn't mean anything
 *
 * XXX I don't understand this function anymore
 *  - review lime for reasons/examples
 *  - make sure they make it into comments and tests
 */
function vertexFixedMatch(innerData, innerMatch, outer, vo_key, unitsOnly) {
  if(unitsOnly || innerMatch.options.transitionable) return Promise.resolve(true);

  // if pointer, then we want to use the data we found as the matcher data
  // if !pointer, then we need to use the match.data on the object
  // this will also correct for subgraph.matcher.id
  if(!innerMatch.options.pointer)
    innerData = innerMatch.data;

  // outer data is simple since it's concerete
  let outerData;
  if(innerMatch.matcher === subgraph.matcher.id)
    outerData = Promise.resolve(outer.getIdea(vo_key));
  else
    outerData = outer.getData(vo_key);

  return outerData.then(function() {
    return innerMatch.matcher(outerData, innerData);
  });
}