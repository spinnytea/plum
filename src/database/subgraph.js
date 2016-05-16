'use strict';
const _ = require('lodash');
const bluebird = require('bluebird');
const ideas = require('./ideas');
const links = require('./links');
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

    if(this.__all_edges__)
      copy.__all_edges__ = this.__all_edges__;

    // straight copy the primitives
    copy._vertexCount = this._vertexCount;
    copy._edgeCount = this._edgeCount;
    copy.concrete = this.concrete;

    return copy;
  }

  // add a vertex to the graph
  // this only specifies match data
  // the other parts (ideas / data) need to be found later
  //
  // @param matcher: exports.matcher or equivalent
  // @param data: passed to the matcher
  // @param options: {
  //   transitionable: boolean, // if true, this is part of a transition (subgraph.rewrite, blueprints, etc; subgraph.rewrite(transitions);)
  //                            // it means that we are intending to change the value
  //   pointer: boolean, // if true, this should use a different object for the match data
  //                      // specifically, use vertex[data].data instead of match data
  //                      // (it doesn't make sense to use this with matcher.filler)
  // }
  addVertex(matcher, data, options) {
    // TODO do these NEED to be specified? can we leave them undefined?
    options = _.merge({
      transitionable: false,
      pointer: false
    }, options);

    if (!matcher || matcher !== exports.matcher[matcher.name])
      throw new RangeError('invalid matcher');
    if (options.pointer && this.getMatch(data) === undefined)
      throw new RangeError('pointer target (match.data) must already be a vertex');
    if (matcher !== exports.matcher.filler && data === undefined)
      throw new RangeError('match data must be defined');
    if (matcher === exports.matcher.substring)
      data.value = data.value.toLowerCase();

    const id = this._vertexCount;
    this._vertexCount++;

    this._match.set(id, {
      matcher: matcher,
      data: data,
      options: options
    });

    if (matcher === exports.matcher.id) {
      this._match.get(id).data = (data.id || data); // unwrap the id
      this._idea[id] = ideas.proxy(data);
    } else {
      this.concrete = false;
    }

    return id;
  }

  // @param src: a vertex ID
  // @param link: the link from src to dst
  // @param dst: a vertex ID
  // @param options.pref: higher prefs will be considered first (default: 0)
  // @param options.transitive: the same as link.transitive; will search in a transitive manner
  // @param options.transitionable: can the edge be changed by actions (subgraph.rewrite)
  //
  // - rejected options
  // @param options.byIdeaLink: during subgraph.match, instead of matching subgraph edges uses the existing idea link
  // - we can't do this because the subgraph represents our imagination, we can't plan ahead if we don't let the subgraph contain ALL the information
  addEdge(src, link, dst, options) {
    // TODO do these NEED to be specified? can we leave them undefined?
    options = _.merge({
      pref: 0,
      transitive: false,
      transitionable: false
    }, options);

    if (!_.isNumber(src))
      throw new TypeError('src not a vertex');
    if (src >= this._vertexCount || src < 0)
      throw new RangeError('src not a vertex');
    if (!_.isNumber(dst))
      throw new TypeError('src not a vertex');
    if (dst >= this._vertexCount || dst < 0)
      throw new RangeError('dst not a vertex');
    if (!link || !link.name || !links.get(link.name))
      throw new TypeError('invalid link');

    if (!_.isNumber(options.pref))
      throw new TypeError('invalid options.pref');
    if (!_.isBoolean(options.transitive))
      throw new TypeError('invalid options.transitive');
    if (!_.isBoolean(options.transitionable))
      throw new TypeError('invalid options.transitionable');

    const id = this._edgeCount;
    this._edgeCount++;
    delete this.__all_edges__;

    // store the edges in a normalized form so we don't need to account for it while searching/matching
    if (link.isOpp) {
      this._edges.set(id, {
        src: dst,
        link: link.opposite,
        dst: src,
        options: options
      });
    } else {
      this._edges.set(id, {
        src: src,
        link: link,
        dst: dst,
        options: options
      });
    }

    return id;
  }

  //

  getMatch(id) {
    // XXX should this return a promise?
    return this._match.get(id);
  }

  getIdea(id) {
    return this._idea[id];
  }
  allIdeas() {
    return _.assign({}, this._idea);
  }
  deleteIdea(id) {
    if(id in this._idea) {
      // if the id is present, then this is no longer concrete
      // if the id is NOT present, then it doesn't change anything
      this.concrete = false;
      delete this._idea[id];
    }
  }

  getData(id) {
    var that = this;
    return bluebird.coroutine(function*() {
      let data = that._data.get(id);

      if(data === null) {
        return undefined;
      } else if(data !== undefined) {
        return data;
      } else if(that.getIdea(id) === undefined) {
        return undefined;
      } else {
        // try to load the data
        let proxy = yield that.getIdea(id);
        data = yield proxy.data();
        if(data === undefined) {
          that._data.set(id, null);
        } else {
          that._data.set(id, data);
        }
        return data;
      }
    })();
  }
  setData(id, value) {
    return this._data.set(id, value);
  }
  deleteData() {
    if(arguments.length) {
      // only reset the ones in the arguments
      const sg = this;
      _.forEach(arguments, function(id) {
        sg._data.set(id, undefined);
      });
    } else {
      // reset all vertices
      // FIXME this should be internal to the object, or create a new one
      this._data.data = {};
      this._data.parent = undefined;
    }
  }
  
  //
  
  getEdge(id) {
    // XXX should this return a promise?
    return this._edges.get(id);
  }
  allEdges() {
    // TODO this could be made faster
    // TODO move into LazyCopyObject; but it makes some assumptions about i/_edgeCount so I don't want to
    if(!this.__all_edges__) {
      var array = new Array(this._edgeCount);
      for(let i=0; i<this._edgeCount; i++)
        array[i] = this._edges.get(i);
      this.__all_edges__ = Object.freeze(array);
    }
    return this.__all_edges__;
  }
}

class LazyCopyObject {
  constructor(p) {
    if(p !== undefined && !(p instanceof LazyCopyObject))
      throw new TypeError('parent must be of type LazyCopyObject');

    this.data = {};
    this.parent = p;
  }

  set(id, value) {
    this.data[id] = value;
  }

  get(id) {
    if(id in this.data)
      return this.data[id];

    if(this.parent)
      return this.parent.get(id);

    return undefined;
  }
// TODO flatten - to be called once we are satisfied with a Subgraph
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
