'use strict';
const fs = require('fs');

// we need to suspend interactions with config until after we have called init
const init = Promise.defer();

// get the saved value, or use the passed in default (the default will be saved)
exports.get = ((path, key, value) => init.promise.then(() => getValue(path, key, value)));
exports.set = ((path, key, value) => init.promise.then(() => setValue(path, key, value)));
exports.init = ((o) => doInit(o));

Object.defineProperty(exports, 'units', { value: {} });
exports.units.data = {};
exports.units.getValue = getValue;
exports.units.setValue = setValue;
exports.units.doInit = doInit;
exports.units.location = undefined;
exports.units.saveTimeout = undefined;
exports.units.writing = undefined;

// XXX do we really need a path AND key, we can just use the convention of dot notation
// - the main reason for this is for ids.next, but it's easy enough to do this with key/value
// - or with idea contexts; the path is the namespace, the key is the specific context
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

function doInit(options={}) {
  if(options.location) {
    require('./database/ideas').boundaries.useFileDB(options.location);
    exports.units.location = options.location;
  } else {
    require('./database/ideas').boundaries.useMemoryDB();
  }
  init.resolve();
}


//
// TODO refactor all BELOW so it makes more sense
//

// TODO save on exit
// TODO return a promise
// TODO wait for init
exports.save = function() {
  if(!exports.units.location) return;
  clearTimeout(exports.units.saveTimeout);
  exports.units.saveTimeout = setTimeout(function() {
    // if we are currently writing something, redo the timeout
    if(exports.units.writing)
      exports.save();

    exports.units.writing = true;
    fs.writeFile(
      exports.units.location + '/_settings.json',
      JSON.stringify(exports.units.data),
      { encoding: 'utf8' },
      function() { exports.units.writing = false; }
    );
  }, 1000);
};
