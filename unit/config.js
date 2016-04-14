'use strict';
const expect = require('chai').expect;
const config = require('../src/config');

describe('config', function() {
  it('init', function() {
    expect(Object.keys(config.units)).to.deep.equal(['data', 'getValue', 'setValue']);
  });

  it('data', function() { /* there is nothing to test */ });

  describe('getValue', function() {
    let path = 'some.path';
    let key = 'someKey';
    let value = 'some value';

    afterEach(function() { delete config.units.data[path]; });

    it('no default', function() {
      expect(config.units.data).to.not.have.property(path);
      expect(config.units.getValue(path, key)).to.equal(undefined);
      expect(config.units.data).to.have.property(path);

      // fake it for the test
      config.units.data[path][key] = value;

      expect(config.units.getValue(path, key)).to.equal(value);
    });

    it('with default', function() {
      expect(config.units.data).to.not.have.property(path);
      expect(config.units.getValue(path, key, value)).to.equal(value);
      expect(config.units.data[path][key]).to.equal(value);
    });

    it('invalid args', function() {
      expect(function() { config.units.getValue(); }).to.throw();
      expect(function() { config.units.getValue(path); }).to.throw();
    });
  }); // end getValue

  describe('setValue', function() {
    let path = 'some.path';
    let key = 'someKey';
    let value1 = 'some value';
    let value2 = 'some value';

    afterEach(function() { delete config.units.data[path]; });

    it('valid', function() {
      expect(config.units.data).to.not.have.property(path);
      expect(config.units.setValue(path, key, value1)).to.equal(value1);
      expect(config.units.data).to.have.property(path);

      expect(config.units.data[path][key]).to.equal(value1);
      expect(config.units.setValue(path, key, value2)).to.equal(value2);
      expect(config.units.data[path][key]).to.equal(value2);
    });

    it('invalid args', function() {
      expect(function() { config.units.setValue(); }).to.throw();
      expect(function() { config.units.setValue(path); }).to.throw();
    });
  }); // end setValue
}); // end config