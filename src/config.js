'use strict';
// TODO save/load settings file
// XXX do we really need a path AND key, we can just use the convention of dot notation
// - the main reason for this is for ids.next, but it's easy enough to do this with key/value
// - or with idea contexts; the path is the namespace, the key is the specific context

// get the saved value, or use the passed in default (the default will be saved)
exports.get = ((path, key, value) => Promise.resolve(getValue(path, key, value)));
exports.set = ((path, key, value) => Promise.resolve(setValue(path, key, value)));

Object.defineProperty(exports, 'units', { value: {} });
exports.units.data = {};
exports.units.getValue = getValue;
exports.units.setValue = setValue;

function getConfigObject(path, key) {
  if(!path) throw new Error('configuration must specify a path');
  if(!key) throw new Error('configuration must specify a key');
  return (exports.units.data[path] = exports.units.data[path] || {});
}

// XXX do we want to actually store the default value?
// XXX what if the value is falsy? what if the new value is falsy but the default is not?
// - granted, this isn't how the config is going to be used, but still
function getValue(path, key, value) {
  const obj = getConfigObject(path, key);
  return (obj[key] = (obj[key] || value));
}
function setValue(path, key, value) {
  const obj = getConfigObject(path, key);
  return (obj[key] = value);
}
