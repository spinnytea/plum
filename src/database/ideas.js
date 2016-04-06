'use strict';
// these are the vertices of the though graph
// this is how all the data is stored
const _ = require('lodash');
const ids = require('../ids');

const memory = new Map();
const NEXT_ID = 'ideas';
let saveFn = memorySave;


class CoreIdea {

}

class ProxyIdea {
  constructor(id) { this.id = id; }
}


exports.create = function(data) {
  return ids.next(NEXT_ID).then(function(id) {
    memory[id] = new CoreIdea(id, _.cloneDeep(data));
    if(data) return exports.save(id);
    else return Promise.resolve(new ProxyIdea(id));
  });
};

exports.save = function(idea) {
  let proxy = new ProxyIdea(getID(idea));
  let core = memory[proxy.id];

  if(core) {
    return Promise.all([
      saveFn(proxy.id, 'data', core.data),
      saveFn(proxy.id, 'links', core.links)
    ]).then(() => proxy);
  } else {
    return Promise.resolve(proxy);
  }
};


Object.defineProperty(exports, 'units', { value: {} });
exports.units.memory = memory;
exports.units.getID = getID;

function getID(idea) {
  let id = idea.id || idea;
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
