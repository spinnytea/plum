'use strict';
// these are the vertices of the though graph
// this is how all the data is stored
const _ = require('lodash');
const bluebird = require('bluebird');
const config = require('../config');
const ids = require('../ids');

const memory = new Map();
const NEXT_ID = 'ideas';
const contextPromise = config.get('ideas', 'context', {});
let loadFn = memoryLoad;
let saveFn = memorySave;


class CoreIdea {
  constructor(id, data, links) {
    this.id = id;
    this.data = data;
    this.links = links || {};
  }
}

class ProxyIdea {
  constructor(id) { this.id = id; }
  update(data) { return exports.load(this.id).then(()=>(memory.get(this.id).data = _.cloneDeep(data))); }
  data() { return exports.load(this.id).then(()=>_.cloneDeep(memory.get(this.id).data)); }
}


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

// XXX exports.delete
exports.close = bluebird.coroutine(function*(idea) {
  const proxy = yield exports.save(idea);
  memory.delete(proxy.id);
  return proxy;
});

/* allows for hard coded context ideas */
exports.context = bluebird.coroutine(function*(name) {
  if(!name) throw new Error('must provide a name');
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
  if(obj) exports.boundaries.database[which][id] = obj;
  else delete exports.boundaries.database[which][id];
  return Promise.resolve();
}
