'use strict';
const expect = require('chai').expect;
const config = require('../src/config');

describe('config', function() {
  it('init', function() {
    expect(Object.keys(config.units)).to.deep.equal(['data', 'getValue', 'setValue']);
  });

  it('data', function() { /* there is nothing to test */ });

  it('getValue', function() {
    let path = 'some.path';
    let key = 'someKey';
    let value = 'some value';

    expect(config.units.data).to.not.have.property(path);
    expect(config.units.getValue(path, key)).to.equal(undefined);
    expect(config.units.data).to.have.property(path);

    // fake it for the test
    config.units.data[path][key] = value;

    expect(config.units.getValue(path, key)).to.equal(value);

    delete config.units.data[path];
  });

  it('setValue', function() {
    let path = 'some.path';
    let key = 'someKey';
    let value1 = 'some value';
    let value2 = 'some value';

    expect(config.units.data).to.not.have.property(path);
    config.units.setValue(path, key, value1);
    expect(config.units.data).to.have.property(path);

    expect(config.units.data[path][key]).to.equal(value1);
    config.units.setValue(path, key, value2);
    expect(config.units.data[path][key]).to.equal(value2);

    delete config.units.data[path];
  });
}); // end config