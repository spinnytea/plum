'use strict';
const _ = require('lodash');

module.exports = exports = match;

Object.defineProperty(exports, 'units', { value: {} });
exports.units.SubgraphMatchMetadata = SubgraphMatchMetadata;
exports.units.match = match;
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
    // TODO reconsider data structure; es6 Map?
    this.vertexMap = exports.units.initializeVertexMap(outer, inner, unitsOnly);
    // inverse map
    this.inverseMap = _.invert(this.vertexMap);

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
  // TODO check all the cases for exiting early with no match

  const metadata = exports.units.SubgraphMatchMetadata(outer, inner, unitsOnly);

  // TODO exit early if vertex map is finished

  // TODO recurse
}

/**
 * @return an object of key-value pairs
 *  - vertexMap[inner vertex key] = outer vertex key;
 */
function initializeVertexMap(outer, inner, unitsOnly) {
  // TODO finish
}