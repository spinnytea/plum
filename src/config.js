'use strict';

// TODO simplify
let promise = Promise.resolve();
function chain(value) {
  return (promise = promise.then(function() { return value(); }));
}

exports.get = ((path, key) => chain(() => getValue(path, key)));
exports.set = ((path, key, value) => Promise.resolve(setValue(path, key, value)));

Object.defineProperty(exports, 'units', { value: {} });
exports.units.data = {};
exports.units.getValue = getValue;
exports.units.setValue = setValue;

function getValue(path, key) {
  if(!path) throw new Error('configuration must specify a path');
  if(!key) throw new Error('configuration must specify a key');
  var obj = (exports.units.data[path] = exports.units.data[path] || {});
  return (obj[key] = obj[key]);
}
function setValue(path, key, value) {
  if(!path) throw new Error('configuration must specify a path');
  if(!key) throw new Error('configuration must specify a key');
  return ((exports.units.data[path] = exports.units.data[path] || {})[key] = value);
}
