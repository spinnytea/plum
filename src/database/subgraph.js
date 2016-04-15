'use strict';

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
    this._match = new LazyCopyObject();
  }
}

class LazyCopyObject {
  constructor() {
    this.data = {};
    this.parent = undefined;
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
