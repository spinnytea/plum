'use strict';
const _ = require('lodash');
const ideas = require('./ideas');
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

  copy() {
    let copy = new Subgraph();

    // the ideas should/will never change
    // so we can reference the original
    // this is what we are trying to pin down, so as we do so we can copy them directly
    _.assign(copy._idea, this._idea);

    // do the parent copy for the applicable values
    copyParentyThing(this, copy, '_match');
    copyParentyThing(this, copy, '_data');
    copyParentyThing(this, copy, '_edges');

    // straight copy the primitives
    copy._vertexCount = this._vertexCount;
    copy._edgeCount = this._edgeCount;
    copy.concrete = this.concrete;

    return copy;
  }

  // TODO flatten - flatten the LazyCopyObjects - call once we are satisfied with a Subgraph

  // add a vertex to the graph
  // this only specifies match data
  // the other parts (ideas / data) need to be found later
  //
  // @param matcher: exports.matcher or equivalent
  // @param data: passed to the matcher
  // @param options: {
  //   transitionable: boolean, // if true, this part of a transition (subgraph.rewrite, blueprints, etc; subgraph.rewrite(transitions);)
  //                            // it means that we are intending to change the value
  //   variable: boolean, // if true, this should use a different object for the match data
  //                      // specifically, use vertex[data].data instead of match data
  //                      // (it doesn't make sense to use this with matcher.filler)
  // }
  addVertex(matcher, data, options) {
    // TODO do these NEED to be specified? can we leave them undefined?
    options = _.merge({
      transitionable: false,
      variable: false
    }, options);

    if(!matcher || matcher !== exports.matcher[matcher.name])
      throw new RangeError('invalid matcher');
    if(options.variable && this.getMatch(data) === undefined)
      throw new RangeError('variable target (match.data) must already be a vertex');
    if(matcher !== exports.matcher.filler && data === undefined)
      throw new Error('match data must be defined');
    if(matcher === exports.matcher.substring)
      data.value = data.value.toLowerCase();

    var id = this._vertexCount + '';
    this._vertexCount++;

    this._match[id] = {
      matcher: matcher,
      data: data,
      options: options
    };

    if(matcher === exports.matcher.id) {
      this._match[id].data = (data.id || data); // unwrap the id
      this._idea[id] = ideas.proxy(data);
    } else {
      this.concrete = false;
    }

    return id;
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

// matchers
// any matcher used must be in this list, and the function must have the same name as the property
// custom matcher can be created at started like links
exports.matcher = {
  id: function id(idea, matchData) {
    // XXX this could be an empty object
    return matchData === idea.id;
  },
  filler: function filler() {
    return true;
  },

  exact: function exact(data, matchData) {
    return _.isEqual(data, matchData);
  },
  similar: function similar(data, matchData) {
    // matchData should be contained within data
    return _.isEqual(data, _.merge(_.cloneDeep(data), matchData));
  },
  substring: function substring(data, matchData) {
    if(matchData.path && matchData.path.length)
      data = _.property(matchData.path)(data);
    if(!_.isString(data))
      return false;
    return data.toLowerCase().indexOf(matchData.value) !== -1;
  },
};


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
