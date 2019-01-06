'use strict';
// generate/increment IDs
// acts the same as counting (1, 2, 3, ... 9, 10, 11, ...) but with a larger character set
const _ = require('lodash');
const Bluebird = require('bluebird');
const config = require('./config');
const utils = require('./utils');


// just increment the value
exports.anonymous = (nextID => increment(nextID || '0'));

// chain together the promises so we can call this multiple times before going async
exports.next = utils.transaction(Bluebird.coroutine(function*(key) {
  let nextID = yield config.get('ids', key, '0');
  nextID = increment(nextID);
  return config.set('ids', key, nextID);
}));


Object.defineProperty(exports, 'units', { value: {} });
exports.units.tokens = Object.freeze([
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // numbers
  //'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', // upper case letters
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', // lower case letters
]);
exports.units.replaceAt = replaceAt;
exports.units.increment = increment;

function replaceAt(str, index, character) {
  return str.substr(0, index) + character + str.substr(index+character.length);
}

function increment(nextID) {
  if(!_.isString(nextID)) throw new TypeError('nextID must be a string');
  const tokens = exports.units.tokens;
  let index = nextID.length-1;

  while(index > -2) {
    if(index === -1) {
      nextID = tokens[1] + nextID; // 10000...
    } else {
      // get the next token index
      const idx = tokens.indexOf(nextID.charAt(index)) + 1;

      // if we can't increase that anymore, then increase the next value
      if(idx === tokens.length) {
        // increment the value before recursion
        // when we roll over (99 -> 100), our index will be off by one
        nextID = replaceAt(nextID, index, tokens[0]);
      } else {
        nextID = replaceAt(nextID, index, tokens[idx]);
        index = -1;
      }
    }
    index--;
  }

  return nextID;
}
