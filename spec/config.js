'use strict';
const expect = require('chai').use(require('chai-as-promised')).expect;
const config = require('../src/config');

describe('config', function() {
  it('init', function() {
    expect(Object.keys(config)).to.deep.equal(['get', 'set']);
  });

  const path = 'some.path';
  const key = 'someKey';
  const value = 'some value';
  function cleanup(result) {
    expect(config.units.data).to.have.property(path);
    expect(config.units.data[path]).to.have.property(key);
    delete config.units.data[path];
    return result;
  }

  beforeEach(invariants);
  afterEach(invariants);
  function invariants() {
    expect(config.units.data).to.not.have.property(path);
  }

  //

  it('get (empty)', function() {
    return expect(config.get(path, key).then(cleanup)).to.eventually.equal(undefined);
  });

  it('get (value)', function() {
    config.units.data[path] = {};
    config.units.data[path][key] = value;
    return expect(config.get(path, key).then(cleanup)).to.eventually.equal(value);
  });

  it('set', function() {
    return expect(config.set(path, key, value).then(cleanup)).to.eventually.equal(value);
  });
}); // end config