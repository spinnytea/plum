'use strict';
// these are the vertices of the though graph
// this is how all the data is stored
const _ = require('lodash');
const ids = require('../ids');

const memory = new Map();
const NEXT_ID = 'ideas';
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


exports.create = function(data) {
  return ids.next(NEXT_ID).then(function(id) {
    memory.set(id, new CoreIdea(id, _.cloneDeep(data)));
    if(data) return exports.save(id);
    else return Promise.resolve(new ProxyIdea(id));
  });
};

exports.load = function(idea) {
  const proxy = new ProxyIdea(getID(idea));
  if(memory.has(proxy.id)) {
    return Promise.resolve(proxy);
  } else {
    return Promise.all([
      loadFn(proxy.id, 'data'),
      loadFn(proxy.id, 'links'),
    ]).then(function() { // TODO use destructuring
      memory.set(proxy.id, new CoreIdea(proxy.id, arguments[0], arguments[1]));
      return proxy;
    });
  }
};
exports.proxy = function(idea) {
  return Promise.resolve(new ProxyIdea(idea));
};

exports.save = function(idea) {
  const proxy = new ProxyIdea(getID(idea));
  const core = memory.get(proxy.id);

  if(core) {
    return Promise.all([
      saveFn(proxy.id, 'data', core.data),
      saveFn(proxy.id, 'links', core.links)
    ]).then(() => proxy);
  } else {
    return Promise.resolve(proxy);
  }
};

// XXX exports.delete
exports.close = function(idea) {
  return exports.save(idea).then(function(proxy) {
    memory.delete(proxy.id);
    return proxy;
  });
};


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
