'use strict';
const expect = require('chai').expect;
const ideas = require('../../src/database/ideas');

describe('ideas', function() {
  it('init', function() {
    expect(Object.keys(ideas.units)).to.deep.equal(['memory', 'getID']);
  });

  it('memory', function() {
    // okay, I know, this is just testing maps
    // but this is how memory is used
    const map = new Map();
    const key = 'thing1';
    const value = 10;

    expect(map.has(key)).to.equal(false);
    map.set(key, value);
    expect(map.has(key)).to.equal(true);
    expect(map.get(key)).to.equal(value);
    map.delete(key);
    expect(map.has(key)).to.equal(false);

    map.set(key, value);
    expect(map.has(key)).to.equal(true);
    map.clear();
    expect(map.has(key)).to.equal(false);
  });

  it('getID', function() {
    const getID = ideas.units.getID;

    expect(getID('_test')).to.equal('_test');
    expect(getID({ id: '_test' })).to.equal('_test');

    expect(function() { getID(); }).to.throw(TypeError);
    expect(function() { getID(1234); }).to.throw(TypeError);
    expect(function() { getID({}); }).to.throw(TypeError);
  });
  it.skip('getID with ProxyIdea');
}); // end ideas