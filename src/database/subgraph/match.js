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
exports.units.filterOuter = filterOuter;
exports.units.checkVertexData = checkVertexData;
exports.units.checkTransitionableVertexData = checkTransitionableVertexData;
exports.units.checkFixedVertexData = checkFixedVertexData;

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
    // XXX should we only skip if the target isn't mapped? if so, then do we need 'skipThisTime'?
    if(prev === null || curr.options.pref > prev.options.pref && metadata.skipThisTime.has(curr))
      return curr;
    return prev;
  }, null);

  // find all matching outer edges
  return Promise.all(metadata.getOuterEdges(innerEdge).map(function(outerEdge) {
    return exports.units.filterOuter(metadata, innerEdge, outerEdge);
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
      // XXX should we only skip if the target isn't mapped?
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
  constructor(outer, inner, vertexMap, unitsOnly, isClone) {
    // outer subgraph (concrete, the represents the world)
    this.outer = outer;
    // inner subgraph (the one we are matching)
    this.inner = inner;
    // do we use the matcher, or just match the units?
    this.unitsOnly = unitsOnly;

    // the edges in the outer subgraph, grouped by link
    this.outerEdges = new Map();
    // a list of inner edges, will be pruned as they are validated
    this.innerEdges = isClone?undefined:inner.allEdges().slice(0);

    // vertexes we have matched so far
    this.vertexMap = new Map(vertexMap);
    // inverse map
    this.inverseMap = new Map();
    vertexMap.forEach((o,i)=>this.inverseMap.set(o,i));

    // edges we have mapped so far
    this.edgeMap = isClone?undefined:new Map();

    // a list of edges we are going to skip until we match our next edge
    this.skipThisTime = new Set();

    if(!isClone) {
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
  }
  clone() {
    let c = new SubgraphMatchMetadata(this.outer, this.inner, this.vertexMap, this.unitsOnly, true);

    // copy the complex objects by hand
    c.edgeMap = new Map(this.edgeMap);
    c.innerEdges = this.innerEdges.slice(0);
    for(let [link, list] of this.outerEdges)
      c.outerEdges.set(link, list.slice(0));

    return c;
  }

  getOuterEdges(edge) {
    return this.outerEdges.get(edge.link.name) || [];
  }
  removeInnerEdge(innerEdge) {
    _.pull(this.innerEdges, innerEdge);
  }
  removeOuterEdge(outerEdge) {
    // TODO it would be more efficient to keep the list and build an inverse edge map
    // - we need to clone the inverse edge map instead of deep cloning outerEdges
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
  // checkVertexData expects a metadata object; these are the only values it uses
  const meta = { outer: outer, inner: inner, unitsOnly: unitsOnly };
  innerIdeas.forEach(function(vi_idea, vi_key) {
    const vo_key = getOuterVertexId(vi_idea.id);
    if(vo_key) {
      vertexMap.set(vi_key, vo_key);
      promises.push(exports.units.checkVertexData(meta, vi_key, vo_key));
    } else {
      // if inner has been mapped to something that doesn't exist in outer
      // then this cannot be reconciled
      promises.push(false);
    }
  });

  return Promise.all(promises).then(function(possible) {
    if(possible.every(_.identity))
      return vertexMap;
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
 * check to see if the outer edge is a good match for the inner edge
 *
 * @prereq: outerEdge.link === innerEdge.link (handled by grouping outer by type)
 * @prereq: outerEdge has not already been mapped (handled by removing outer from pool when matched)
 * @param metadata
 * @param outerEdge
 * @param innerEdge
 * @return outerEdge if we should use outer edge to expand, undefined otherwise, wrapped in a promise
 */
function filterOuter(metadata, innerEdge, outerEdge) {
  return Promise.all([
    exports.units.checkVertexData(metadata, innerEdge.src, outerEdge.src),
    exports.units.checkVertexData(metadata, innerEdge.dst, outerEdge.dst),
  ]).then(function([srcPossible, dstPossible]) {
    if(srcPossible && dstPossible)
      return outerEdge;
    return undefined;
  });
}

/**
 * check the matchers against data to make sure the edge is valid
 *
 * checkTransitionableVertexData and checkFixedVertexData are two sides of the same coin
 * one checks transitionable verticies, the other checks non-transitionable vertices
 * this just decides which one to call
 */
function checkVertexData(metadata, vi_key, vo_key) {
  // skip the vertices that are mapped to something different
  if(metadata.vertexMap.has(vi_key)) {
    if(metadata.vertexMap.get(vi_key) !== vo_key)
      return Promise.resolve(false);
  } else {
    // outerEdge src is mapped to a different inner id
    if(metadata.inverseMap.has(vo_key))
      return Promise.resolve(false);
  }

  return Promise.resolve([
    exports.units.checkTransitionableVertexData(metadata, vi_key, vo_key),
    exports.units.checkFixedVertexData(metadata, vi_key, vo_key),
  ]).then(function([trans, fixed]) {
    return (trans && fixed);
  });
}

/**
 * this function checks transitionable vertices to see if a transition is possible
 * it should noop for non-transitionable vertices (returns true because it isn't determined to be invalid)
 */
function checkTransitionableVertexData(metadata, vi_key, vo_key) {
  return bluebird.coroutine(function*() {
    const innerMatch = metadata.inner.getMatch(vi_key);

    // if the inner isn't transitionable, then we don't need to check anything
    if(!innerMatch.options.transitionable) return true;
    // the outer must be transitionable, otherwise it's a config/matcher problem
    // the outer subgraph defines up front what values it expects to change
    if(!metadata.outer.getMatch(vo_key).options.transitionable) return false;

    // make sure we have data to work with
    // XXX do some units require data?
    // - let's say one is inner is null and outer is not
    // - can we use the units of outer to triage inner?
    // - I feel like "just returning true" is a bad assumption to make
    // - just because they are marked as "transitionable", does it mean that "null is an acceptable value"?
    // - maybe we'll never get into this situation, so maybe this concern is moot
    const vi_data = yield exports.boundaries.getData(metadata, vi_key, innerMatch);
    if(!vi_data) return true;
    const vo_data = yield metadata.outer.getData(vo_key);
    if(!vo_data) return true;

    // this might be pedantic, but it'll make thing easier later
    // they must either both HAVE or NOT HAVE a unit
    if(vi_data.hasOwnProperty('unit') !== vo_data.hasOwnProperty('unit')) return false;

    if(metadata.unitsOnly) {
      // TODO what does this mean? unit only but no units
      // - unit only is a core part of the planning for things like distance
      // - units are how we reason about the distance and how it will relate to other unit distances
      //   (like how does 2 meters and 10 centimeters relate to one another?)
      // - this 'transitionable' FORCE the data to have units? of not, then how do we measure distance?
      // - this is a problem will will crop up in astar and planning; this unitsOnly path is specifically designed for it
      if(!vo_data.hasOwnProperty('unit')) return false;

      // match the units
      return vi_data.unit === vo_data.unit;
    } else {
      return exports.boundaries.dataEquality(vi_data, vo_data);
    }
  })();
}

/**
 * check the matcher function against the outer data
 *
 * if a vertex is not marked as transitionable
 * or if we are not checking unit only
 * then we need a harder check on the value
 */
function checkFixedVertexData(metadata, vi_key, vo_key) {
  return bluebird.coroutine(function*() {
    // only necessary to check when the inner idea has not been identified
    // because matchers are used for identifying the ideas; ones ideas have been identified, the matchers don't make sense anymore
    // matchers are for the identification phase; once we have ideas, then we are in an imagination phase
    if(metadata.inner.hasIdea(vi_key)) return true;

    const innerMatch = metadata.inner.getMatch(vi_key);

    // these cases are handled by checkTransitionableVertexData
    if(metadata.unitsOnly || innerMatch.options.transitionable) return true;

    // if pointer, then we want to use the data we found as the matcher data
    // if !pointer, then we need to use the match.data on the object
    // this will also correct for subgraph.matcher.id
    let innerData;
    if(innerMatch.options.pointer)
      innerData = yield exports.boundaries.getData(metadata, vi_key, innerMatch);
    else
      innerData = innerMatch.data;

    // outer data is simple since it's concerete
    let outerData;
    if(innerMatch.matcher === subgraph.matcher.id)
      outerData = metadata.outer.getIdea(vo_key);
    else
      outerData = yield metadata.outer.getData(vo_key);

    return innerMatch.matcher(outerData, innerData);
  })();
}

// TODO do we need to push more things to the boundaries?
Object.defineProperty(exports, 'boundaries', { value: {} });
exports.boundaries.dataEquality = dataEquality;
exports.boundaries.getData = getData;

// XXX we need a distance function for each kind of unit, use that instead
// - or maybe each unit will also have an equality check
function dataEquality(vi_data, vo_data) {
  return _.isEqual(vi_data, vo_data);
}

/**
 * we need to find the match data since it could be in a few places
 * this is thanks to match.options.pointer
 * without pointers, it would just be the first return
 *
 * this isn't part of subgraph.getData because this is specific to matching/searching
 * (searching looks for the target's data, too)
 * once the subgraph is concrete, then the data should only come from the mapped idea
 * TL;DR: pointer is used for matching only
 */
function getData(metadata, vi_key, innerMatch) {
  return bluebird.coroutine(function*() {
    // if this is not a pointer, then we use the data at this vertex
    // if it already is mapped, then use the data at this vertex
    if(!innerMatch.options.pointer || metadata.inner.hasIdea(vi_key))
      return metadata.inner.getData(vi_key);

    // if this is a pointer...
    // (and doesn't have and idea mapped)

    // if our inner graph has a value cached for the target, use that
    let data = yield metadata.inner.getData(innerMatch.data);
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
  })();
}
