'use strict';
// some specialized functions in one central place
// I wish these were in lodash

// super fast empty checking
// Object.keys(myObject).length === 0 is terribly slow
exports.isEmpty = function isEmpty(myObject) {
  for(const key in myObject)
    if (myObject.hasOwnProperty(key))
      return false;
  return true;
};
