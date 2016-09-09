'use strict';
const _ = require('lodash');

module.exports = exports = match;

Object.defineProperty(exports, 'units', { value: {} });
exports.units.match = match;
exports.units.recursiveMatch = recursiveMatch;
exports.units.initializeVertexMap = initializeVertexMap;
exports.units.getOuterVertexIdFn = getOuterVertexIdFn;
exports.units.vertexTransitionableAcceptable = vertexTransitionableAcceptable;
exports.units.filterOuter = filterOuter;

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
    this.innerEdges = inner.allEdges();

    // vertexes we have matched so far
    this.vertexMap = vertexMap;
    // inverse map
    this.inverseMap = new Map();
    vertexMap.forEach(this.inverseMap.set);

    // a list of edges we are going to skip until we match our next edge
    this.skipThisTime = new Set();

    // TODO fill outer edges, grouped by type
  }
  clone(existing, innerEdges, vertexMap, inverseMap) {
    this.outer = existing.outer;
    this.inner = existing.inner;
    this.unitsOnly = existing.unitsOnly;

    // outer edges are consumed as we match them, copies need their own version
    this.outerEdges = _.clone(existing.outerEdges);

    // XXX why are these modified outside of the metadata object
    //  - they should have accessor methods
    this.innerEdges = innerEdges;
    this.vertexMap = vertexMap;
    this.inverseMap = inverseMap;
    this.skipThisTime = new Set();
  }
}
exports.units.SubgraphMatchMetadata = SubgraphMatchMetadata;

/**
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

function recursiveMatch(metadata) {
  if(metadata.inner._edgeCount === 0) {
    if(metadata.vertexMap.size === metadata.inner._vertexCount)
      return Promise.resolve([metadata.vertexMap]);
    return Promise.resolve([]);
  }

  // pick the best inner edge
  // (this helps us reduce the number of branches)
  var innerEdge = metadata.innerEdges.reduce(function(prev, curr) {
    if(prev === null || curr.options.pref > prev.options.pref && metadata.skipThisTime.has(curr))
      return curr;
    return prev;
  }, null);

  // find all matching outer edges
  var matches = metadata.outerEdges.get(innerEdge).filter(function(currEdge) {
    return exports.units.filterOuter(metadata, currEdge, innerEdge);
  });

  // 0 outer
  // - deal with vertex.options.pointer
  // - otherwise return no match
  if(matches.length === 0) {
    var innerSrcMatch = metadata.inner.getMatch(innerEdge.src);
    var innerDstMatch = metadata.inner.getMatch(innerEdge.dst);

    // because of indirection, we may need to skip an edge and try the next best one
    // so if our current edge uses inderection, and there are other edges to try, then, well, try again
    // but next time, don't consider this edge
    if((innerSrcMatch.options.pointer || innerDstMatch.options.pointer) && metadata.innerEdges.length > metadata.skipThisTime.size) {
      metadata.skipThisTime.push(innerEdge);
      return exports.units.recursiveMatch(metadata);
    }

    // no matches, and we've skipped everything
    return Promise.resolve([]);
  }

  // TODO 1 outer
  // - reuse metadata
  // - recurse

  // TODO + outer
  // - loop over matches
  // - clone metadata
  // - recurse
}

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

  let promises = [];
  innerIdeas.forEach(function(vi_idea, vi_key) {
    let vo_key = getOuterVertexId(vi_idea.id);
    if(vo_key) {
      vertexMap.set(vi_key, vo_key);

      // vi.idea has been identified so we can use vi.data directly
      promises.push(Promise.all([
        outer.getData(vo_key),
        inner.getData(vi_key),
      ]).then(function([vo_data, vi_data]) {
        let possible = vertexTransitionableAcceptable(
          outer.getMatch(vo_key).options.transitionable,
          vo_data,
          inner.getMatch(vi_key).options.transitionable,
          vi_data,
          unitsOnly);

        // TODO if the match is not possible, then exit early and return []
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
    let inverseOuterMap = {};
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
    // TODO we need a distance function for each kind of unit, use that instead
    return _.isEqual(vo_data, vi_data);
  }
}

function filterOuter(metadata, currEdge, innerEdge) {
  void(metadata, currEdge, innerEdge);
  // FIXME finish
}
