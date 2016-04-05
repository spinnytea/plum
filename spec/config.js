'use strict';
const expect = require('chai').expect;
const config = require('../src/config');

describe('config', function() {
  it('init', function() {
    expect(Object.keys(config)).to.deep.equal(['get', 'set']);
  });

  it('set and get', function(done) {
    let path = 'some.path';
    let key = 'someKey';
    let value = 'some value';

    config.set(path, key, value).then(function(v) {
      expect(v).to.equal(value);
      return config.get(path, key);
    }).then(function(v) {
      expect(v).to.equal(value);
    }).then(function() {
      delete config.units.data[path];
    }).then(done, done);
  });
}); // end config