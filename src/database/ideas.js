'use strict';
// these are the vertices of the though graph
// this is how all the data is stored
const _ = require('lodash');

const memory = new Map();


Object.defineProperty(exports, 'units', { value: {} });
exports.units.memory = memory;
exports.units.getID = getID;

function getID(idea) {
  var id = idea.id || idea;
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
  if(obj)
    exports.boundaries.database[which][id] = obj;
  else
    delete exports.boundaries.database[which][id];
  return Promise.resolve();
}
