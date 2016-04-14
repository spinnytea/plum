'use strict';

exports.get = ((path, key, value) => Promise.resolve(getValue(path, key, value)));
exports.set = ((path, key, value) => Promise.resolve(setValue(path, key, value)));

// TODO save/load settings file

Object.defineProperty(exports, 'units', { value: {} });
exports.units.data = {};
exports.units.getValue = getValue;
exports.units.setValue = setValue;

function getConfigObject(path, key) {
  if(!path) throw new Error('configuration must specify a path');
  if(!key) throw new Error('configuration must specify a key');
  return (exports.units.data[path] = exports.units.data[path] || {});
}

function getValue(path, key, value) {
  const obj = getConfigObject(path, key);
  return (obj[key] = (obj[key] || value));
}
function setValue(path, key, value) {
  const obj = getConfigObject(path, key);
  return (obj[key] = value);
}
