'use strict';
// these are the vertices of the though graph
// this is how all the data is stored
const _ = require('lodash');
const bluebird = require('bluebird');
const config = require('../config');
const ids = require('../ids');
const links = require('./links');
const utils = require('../utils');

const memory = new Map();
const NEXT_ID = 'ideas';
const contextPromise = config.get('ideas', 'context', {});
let loadFn = memoryLoad;
let saveFn = memorySave;


/*
 * this is the singleton that we will keep an internal reference to
 * it's basically just a named structure
 */
class CoreIdea {
  constructor(id, data, links) {
    this.id = id;
    this.data = data;
    this.links = links || {};
  }
}

/*
 * ProxyIdea is an object that only stores the ID
 * this makes it easy to pass around as a data object, to serialize, to load
 * essentially, its just an object { id: 'x' }
 * we can JSON.stringify; we can exports.proxy
 * The functions that are on ProxyIdea reference a singleton that stores the data
 */
class ProxyIdea {
  constructor(id) { this.id = id; }
  data() { return exports.load(this.id).then(()=>_.cloneDeep(memory.get(this.id).data)); }
  setData(data) { return exports.load(this.id).then(()=>(memory.get(this.id).data = _.cloneDeep(data))); }
  links(link) { return exports.load(this.id).then(()=>Object.keys(memory.get(this.id).links[link.name] || {}).map(function(id) { return new ProxyIdea(id); })); }
  // removeLink(link, idea) {}
}
ProxyIdea.prototype.addLink = bluebird.coroutine(function*(link, idea) {
  yield exports.load(idea);
  yield exports.load(this.id);
  (memory.get(this.id).links[link.name] = memory.get(this.id).links[link.name] || {})[idea.id] = {};
  (memory.get(idea.id).links[link.opposite.name] = memory.get(idea.id).links[link.opposite.name] || {})[this.id] = {};
});
ProxyIdea.prototype.removeLink = bluebird.coroutine(function*(link, idea) {
  idea = yield exports.load(idea);
  yield exports.load(this.id);

  // remove the idea from this
  let ls = memory.get(this.id).links;
  let list = ls[link.name];
  delete list[idea.id];
  if(utils.isEmpty(list)) {
    delete ls[link.name];
  }

  // remove this from the idea
  ls = memory.get(idea.id).links;
  list = ls[link.opposite.name];
  delete list[this.id];
  if(utils.isEmpty(list)) {
    delete ls[link.opposite.name];
  }
});


exports.create = bluebird.coroutine(function*(data) {
  const id = yield ids.next(NEXT_ID);
  memory.set(id, new CoreIdea(id, _.cloneDeep(data)));
  if(data) return exports.save(id);
  else return Promise.resolve(new ProxyIdea(id));
});

exports.load = bluebird.coroutine(function*(idea) {
  const proxy = new ProxyIdea(getID(idea));

  if(!memory.has(proxy.id)) {
    const data = yield loadFn(proxy.id, 'data');
    const links = yield loadFn(proxy.id, 'links');
    memory.set(proxy.id, new CoreIdea(proxy.id, data, links));
  }

  return Promise.resolve(proxy);
});
exports.proxy = function(idea) {
  return Promise.resolve(new ProxyIdea(idea));
};

exports.save = bluebird.coroutine(function*(idea) {
  const proxy = new ProxyIdea(getID(idea));
  const core = memory.get(proxy.id);

  if(core) {
    yield saveFn(proxy.id, 'data', core.data);
    yield saveFn(proxy.id, 'links', core.links);
  }

  return Promise.resolve(proxy);
});

exports.close = bluebird.coroutine(function*(idea) {
  const proxy = yield exports.save(idea);
  memory.delete(proxy.id);
  return proxy;
});

exports.delete = bluebird.coroutine(function*(idea) {
  const proxy = yield exports.load(idea);

  // remove all the links
  const ls = memory.get(proxy.id).links;
  for(const linkName of Object.keys(ls)) {
    const link = links.get(linkName);
    for(const id of Object.keys(ls[linkName]))
      yield proxy.removeLink(link, id);
  }

  // clear/delete saved data
  yield saveFn(proxy.id, 'data', undefined);
  yield saveFn(proxy.id, 'links', undefined);

  // remove local memory
  memory.delete(proxy.id);
});

/* allows for hard coded context ideas */
exports.context = bluebird.coroutine(function*(name) {
  if(!name) throw new TypeError('must provide a name');
  const context = yield contextPromise;
  const id = context[name];

  if(id) {
    return Promise.resolve(new ProxyIdea(id));
  } else {
    let proxy = yield exports.create({name:name});
    context[name] = proxy.id;
    yield config.set('ideas', 'context', context);
    return proxy;
  }
});


Object.defineProperty(exports, 'units', { value: {} });
exports.units.memory = memory;
exports.units.getID = getID;
exports.units.ProxyIdea = ProxyIdea;

function getID(idea) {
  if(!idea) throw new TypeError('can only load ideas');
  const id = idea.id || idea;
  if(!_.isString(id)) throw new TypeError('can only load ideas');
  return id;
}

Object.defineProperty(exports, 'boundaries', { value: {} });
exports.boundaries.database = { data: {}, links: {} }; // for memorySave/memoryLoad
exports.boundaries.memoryLoad = memoryLoad;
exports.boundaries.memorySave = memorySave;

function memoryLoad(id, which) {
  return Promise.resolve(exports.boundaries.database[which][id]);
}
function memorySave(id, which, obj) {
  if(obj === undefined) delete exports.boundaries.database[which][id];
  else exports.boundaries.database[which][id] = obj;
  return Promise.resolve();
}
