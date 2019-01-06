'use strict';
const Bluebird = require('bluebird');
// some specialized functions in one central place
// I wish these were in lodash

// super fast empty checking
// Object.keys(myObject).length === 0 is O(n), this should be O(1)
exports.isEmpty = function isEmpty(myObject) {
  for(const key in myObject)
    if(myObject.hasOwnProperty(key))
      return false;
  return true;
};

// chain promises together
// this lets you call the same function multiple times, and guarantees that the first call finishes before the second call begins
// see ids.next for an example
//
// callback must produce a promise
exports.transaction = function promiseTransaction(callback) {
  let txnPromise = Bluebird.resolve();
  return function() {
    // return a promise so we can work with the result of a call as soon as it's ready
    // update the txnPromise so subsequent calls must wait for previous ones to finish
    // use the arguments of this function on the callback
    // (isn't it great that arrow functions don't create their own function scope)
    // XXX what should the apply scope be: null? this? callback?
    return (txnPromise = txnPromise.then(()=>callback.apply(undefined, arguments)));
  };
};
