'use strict';
const bluebird = require('bluebird');

module.exports = exports = rewrite;


Object.defineProperty(exports, 'units', { value: {} });
exports.units.rewrite = rewrite;
exports.units.checkVertex = checkVertex;
exports.units.transitionVertex = transitionVertex;
exports.units.checkEdge = checkEdge;
exports.units.transitionEdge = transitionEdge;

// @param transitions: an array of transitions
//  - { vertex_id: id, replace: value }
//  - { vertex_id: id, replace_id: id } // both are vertex_id's
//  - { edge_id: id, replace_src: id } // both are edge_id's
//  - { edge_id: id, replace_dst: id } // both are edge_id's
// @param actual: boolean (default: false)
//  - if true, write the updates to the idea graph (write through to perceived actuality)
//  - if false, write the updates to the subgraph (in abstract memory)
// @return
//  - if actual, return this
//  - if !actual, return the new subgraph
//  - if unable to perform rewrite, return undefined
function rewrite(subgraph, transitions, actual) {
  actual = (actual === true);

  // XXX is !concrete allowed if !actual
  if(!subgraph.concrete)
    return Promise.resolve(undefined);

  // validate transitions
  // check all transitions to ensure they the vertex or edge checks
  // XXX do we really need to validate the transitions?
  return Promise.all(transitions.map(function(t) {
    if(t.hasOwnProperty('vertex_id')) {
      return exports.units.checkVertex(subgraph, t);
    } else if(t.hasOwnProperty('edge_id')) {
      return exports.units.checkEdge(subgraph, t);
    } else {
      return false;
    }
  })).then(function(list) { return list.every((v)=>(v)); }).then(function(pass) {
    if(!pass)
      return undefined;

    // if this is the actual transition, we apply it to this object
    // if this is a theoretical transition, we apply it to a copy
    if(!actual)
      subgraph = subgraph.copy();

    return Promise.all(transitions.map(function(t) {
      if(t.hasOwnProperty('vertex_id')) {
        return exports.units.transitionVertex(subgraph, t, actual);
      } else { //if(t.hasOwnProperty('edge_id')) {
        return exports.units.transitionEdge(subgraph, t, actual);
      }
    })).then(function() {
      // at long last, return the subgraph
      return subgraph;
    });
  });
}

// return true if the vertex transition is valid
function checkVertex(subgraph, t) {
  if(!t || !t.hasOwnProperty('vertex_id'))
    return Promise.resolve(false);

  if(!(t.hasOwnProperty('replace') || t.hasOwnProperty('replace_id')))
    return Promise.resolve(false);

  const match = subgraph.getMatch(t['vertex_id']);
  if(!match)
    return Promise.resolve(false);

  if(!match.options.transitionable)
    return Promise.resolve(false);

  return subgraph.getData(t['vertex_id']).then(function(data) {
    // if there is no data, then there is nothing to transition
    // XXX is it valid to not yet have data, can a transition fill it in?
    if(data === undefined)
      return false;

    // verify the transition data
    if(t.hasOwnProperty('replace')) {
      return !(data.unit && t.replace.unit && data.unit !== t.replace.unit);
    } else { // if(t.hasOwnProperty('replace_id')) {
      return subgraph.getData(t['replace_id']).then(function(rdata) {
        return !(data.unit && data.unit && data.unit !== rdata.unit);
      });
    }
  });
} // end checkVertex

function transitionVertex(subgraph, t, actual) {
  return bluebird.coroutine(function*() {
    if(t.hasOwnProperty('replace')) {
      subgraph.setData(t['vertex_id'], t.replace);
    } else { // if(t.hasOwnProperty('replace_id')) {
      subgraph.setData(t['vertex_id'], yield subgraph.getData(t['replace_id']));
    }

    if(actual)
      yield exports.boundaries.updateData(subgraph, t['vertex_id']);
  })();
} // end transitionVertex

function checkEdge(subgraph, t) {
  if(!t || !t.hasOwnProperty('edge_id'))
    return Promise.resolve(false);

  if(!(t.hasOwnProperty('replace_src') || t.hasOwnProperty('replace_dst')))
    return Promise.resolve(false);

  const edge = subgraph.getEdge(t['edge_id']);
  if(!edge)
    return Promise.resolve(false);

  if(!edge.options.transitionable)
    return Promise.resolve(false);

  if(t.hasOwnProperty('replace_src')) {
    if(!subgraph.getMatch(t['replace_src']))
      return Promise.resolve(false);
  } else { // if(t.hasOwnProperty('replace_dst')) {
    if(!subgraph.getMatch(t['replace_dst']))
      return Promise.resolve(false);
  }

  return Promise.resolve(true);
} // end checkEdge

function transitionEdge(subgraph, t, actual) {
  const edge = subgraph.getEdge(t['edge_id']);
  const prevSrc = edge.src;
  const prevDst = edge.dst;
  const nextSrc = t.hasOwnProperty('replace_src') ? t['replace_src'] : edge.src;
  const nextDst = t.hasOwnProperty('replace_dst') ? t['replace_dst'] : edge.dst;

  subgraph.updateEdge(t['edge_id'], nextSrc, nextDst);

  if(actual && (nextSrc !== prevSrc || nextDst !== prevDst)) {
    return exports.boundaries.updateLink(subgraph, edge.link, prevSrc, prevDst, nextSrc, nextDst);
  }

  return Promise.resolve();
} // end transitionEdge


Object.defineProperty(exports, 'boundaries', { value: {} });
exports.boundaries.updateData = updateData;
exports.boundaries.updateLink = updateLink;

function updateData(subgraph, vertex_id) {
  return subgraph.getData(vertex_id).then(function(data) {
    return subgraph.getIdea(vertex_id).setData(data);
  });
}

// TODO I don't link this api
// - should it be (subgraph, edge, prevSrc, prevDst)?
// - should it be (subgraph, prevEdge, nextEdge)? where link is the same?
function updateLink(subgraph, link, prevSrc, prevDst, nextSrc, nextDst) {
  return Promise.all([
    subgraph.getIdea(prevSrc).unlink(link, subgraph.getIdea(prevDst)),
    subgraph.getIdea(nextSrc).link(link, subgraph.getIdea(nextDst)),
  ]);
}
