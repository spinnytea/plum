'use strict';
const _ = require('lodash');

module.exports = exports = match;

Object.defineProperty(exports, 'units', { value: {} });
exports.units.match = match;
exports.units.recursiveMatch = recursiveMatch;
exports.units.initializeVertexMap = initializeVertexMap;
exports.units.getOuterVertexIdFn = getOuterVertexIdFn;
exports.units.vertexTransitionableAcceptable = vertexTransitionableAcceptable;

/**
 * an object containing state info for the subgraph match
 * it's a complicated process with a lot of variables, so it's nice to have them packaged up
 * it's a complicated process, so we need to compute some indexes and caches to speed it up
 */
class SubgraphMatchMetadata {
  constructor(outer, inner, unitsOnly) {
    // outer subgraph (concrete, the represents the world)
    this.outer = outer;
    // inner subgraph (the one we are matching)
    this.inner = inner;
    // do we use the matcher, or just match the units?
    this.unitsOnly = unitsOnly;

    // the edges in the outer subgraph, grouped by link
    this.outerEdges = {};
    // a list of inner edges, will be pruned as they are validated
    this.innerEdges = inner.allEdges();

    // vertexes we have matched so far
    this.vertexMap = exports.units.initializeVertexMap(outer, inner, unitsOnly);
    // inverse map
    this.inverseMap = new Map();
    this.vertexMap.forEach(this.inverseMap.set);

    // a list of edges we are going to skip until we match our next edge
    // TODO reconsider data structure; es6 Set?
    this.skipThisTime = [];

    // TODO fill outer edges, grouped by type
  }
  clone(existing, innerEdges, vertexMap, inverseMap) {
    // var existing = subgraphOuter;
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
    this.skipThisTime = [];
  }
}
exports.units.SubgraphMatchMetadata = SubgraphMatchMetadata;

/**
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
    return [];

  // the inner must fit a subset of outer
  // if the inner is larger, then this is impossible
  if(inner._vertexCount > outer._vertexCount || inner._edgeCount > outer._edgeCount)
    return [];

  // ensure it's a boolean
  unitsOnly = (unitsOnly === true);

  const metadata = exports.units.SubgraphMatchMetadata(outer, inner, unitsOnly);

  // if there are no edges, then there is nothing to do in the recursive step
  if(inner._edgeCount === 0) {
    if(metadata.vertexMap.size === inner._vertexCount)
      return [metadata.vertexMap];
    return [];
  }

  // recurse over the edges
  return exports.units.recursiveMatch(metadata).filter(function(map) {
    return map.size === inner._vertexCount;
  });
}

function recursiveMatch(metadata) {
  void(metadata);
  // TODO pick an inner edge

  // TODO find outer edges

  // TODO 0 outer
  // - deal with vertex.options.pointer
  // - otherwise return no match

  // TODO 1 outer
  // - reuse metadata
  // - are we finished? return
  // - recurse

  // TODO + outer
  // - loop over matches
  // - clone metadata
  // - are we finished? done
  // - recurse
}

/**
 * @param outer
 * @param inner
 * @param unitsOnly
 * @return an object of key-value pairs
 *  - vertexMap[inner vertex key] = outer vertex key;
 */
function initializeVertexMap(outer, inner, unitsOnly) {
  const vertexMap = new Map();
  const innerIdeas = inner.allIdeas();
  const getOuterVertexId = exports.units.getOuterVertexIdFn(outer.allIdeas(), innerIdeas.size);

  // TODO if the match is not possible, then exit early and return []
  var possible = true;

  innerIdeas.forEach(function(vi_idea, vi_key) {
    var vo_key = getOuterVertexId(vi_idea.id);
    if(vo_key) {
      vertexMap.set(vi_key, vo_key);

      // TODO check if transition is possible
      void(unitsOnly);
    }
  });

  if(!possible)
    return undefined;

  return vertexMap;
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
  var x = outerIdeas.size;
  var lnx = Math.log(x);
  if(innerCount > x*lnx / (x*Math.LN2-lnx)) {
    // build an index (outer.idea.id -> outer.vertex_id)
    var inverseOuterMap = {};
    outerIdeas.forEach(function(vo_idea, vo_key) {
      inverseOuterMap[vo_idea.id] = vo_key;
    });
    return function index(id) {
      return inverseOuterMap[id];
    };
  } else {
    // do a dumb search through the list
    return function search(id) {
      var found = null;
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
