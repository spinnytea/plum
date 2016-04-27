'use strict';
const utils = require('../utils');

// this is an overlay on the idea database
// it is a proxy or wrapper around the idea graph
// it's main purpose is to find a subgraph within the larger database
//
// you define the shape the graph you want to find, each node has it's own matcher
//
// there are three different stages to this subgraph
// each vertex contains data for these three stages
// for the sake of efficiency, they are not stored together
class Subgraph {
  constructor() {
    // this is how we are going to match an idea in the search and match
    // this is the recipe, the way we determined if this vertex can be pinned to the world (or another subgraph)
    this._match = new LazyCopyObject();

    // this is what we are ultimately trying to find with a subgraph search
    // pinned context
    this._idea = {};

    // theoretical state
    // this is for the rewrite, planning in general
    // if undefined, it hasn't be fetched from idea.data()
    // set to null if there is no data (so we know not to query again)
    this._data = new LazyCopyObject();

    // how the vertices are linked together
    this._edges = new LazyCopyObject();


    // when we generate a new vertex, we need a new key
    // we also want fast access to the number of vertices we have
    this._vertexCount = 0;

    // when we generate a new edge, we need a new key
    // we also want fast access to the number of edges we have
    this._edgeCount = 0;

    // true
    //   does this represent a specific subgraph
    //   all of the vertices have a specific ID
    // false
    //   is it a description of something to find
    // cache value for:
    //   sg._match.every(function(v, id) { return (id in sg._idea); })
    //   Object.keys(sg._match).deep.equals(Object.keys(sg._idea))
    this.concrete = true;
  }
}

class LazyCopyObject {
  constructor(p) {
    if(p !== undefined && !(p instanceof LazyCopyObject))
      throw new TypeError('parent must be of type LazyCopyObject');

    this.data = {};
    this.parent = p;
  }

  set(id, data) {
    this.data[id] = data;
  }

  get(id) {
    if(id in this.data)
      return this.data[id];

    if(this.parent)
      return this.parent.get(id);

    return undefined;
  }
}

Object.defineProperty(exports, 'units', { value: {} });
exports.units.LazyCopyObject = LazyCopyObject;
exports.units.Subgraph = Subgraph;
exports.units.copyParentyThing = copyParentyThing;

// @param orig is a Subgraph
// @param copy is a Subgraph
// @param key is the name of the property that is a LCO
function copyParentyThing(orig, copy, key) {
  // if there are locally defined values
  // then put it in a parent object
  // make that a parent of this
  if(!utils.isEmpty(orig[key].data)) {
    orig[key] = new LazyCopyObject(orig[key]);
  }
  // new or existing, we need to pass the parent to the copy
  copy[key].parent = orig[key].parent;
  // both old and new key thing will be empty
}
