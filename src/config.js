'use strict';

exports.get = function(path, key) {
  return Promise.resolve(getValue(path, key));
};

exports.set = function(path, key, value) {
  setValue(path, key, value);
  return Promise.resolve(value);
};

Object.defineProperty(exports, 'units', { value: {} });
exports.units.data = {};
exports.units.getValue = getValue;
exports.units.setValue = setValue;

function getValue(path, key) {
  if(!path) throw new Error('configuration must specify a path');
  if(!key) throw new Error('configuration must specify a key');
  return (exports.units.data[path] = exports.units.data[path] || {})[key];
}
function setValue(path, key, value) {
  if(!path) throw new Error('configuration must specify a path');
  if(!key) throw new Error('configuration must specify a key');
  (exports.units.data[path] = exports.units.data[path] || {})[key] = value;
}
