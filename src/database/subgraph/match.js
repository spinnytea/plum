'use strict';
const _ = require('lodash');

module.exports = exports = match;

Object.defineProperty(exports, 'units', { value: {} });
exports.units.SubgraphMatchMetadata = SubgraphMatchMetadata;
exports.units.match = match;
exports.units.recursiveMatch = recursiveMatch;
exports.units.initializeVertexMap = initializeVertexMap;

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
  // TODO finish
}

/**
 * @return an object of key-value pairs
 *  - vertexMap[inner vertex key] = outer vertex key;
 */
function initializeVertexMap(outer, inner, unitsOnly) {
  // TODO finish
}