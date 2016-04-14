'use strict';
const expect = require('chai').expect;
const ideas = require('../../src/database/ideas');
const links = require('../../src/database/links');

describe('ideas', function() {
  it('init', function() {
    expect(Object.keys(ideas.units)).to.deep.equal(['memory', 'getID', 'ProxyIdea']);
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

  describe('ProxyIdea', function() {
    let proxy;
    before(function() {
      return ideas.create().then(p => (proxy = p));
    });

    it('data', function() {
      ideas.units.memory.get(proxy.id).data = ['some data'];
      return proxy.data().then(function(data) {
        expect(data).to.deep.equal(['some data']);
        expect(data).to.not.equal(ideas.units.memory.get(proxy.id).data);
      });
    });

    it('setData', function() {
      return proxy.setData('some other data').then(function(data) {
        expect(data).to.equal('some other data');
        expect(ideas.units.memory.get(proxy.id).data).to.equal('some other data');
      });
    });

    it('links', function() {
      // set, get remove
      return ideas.create().then(function(proxy2) {
        const link = links.get('thought_description');

        return proxy.addLink(link, proxy2).then(function() {
          expect(ideas.units.memory.get(proxy.id).links[link.name]).to.have.property(proxy2.id);
          expect(ideas.units.memory.get(proxy2.id).links[link.opposite.name]).to.have.property(proxy.id);

          return proxy.links(link);
        }).then(function(list) {
          expect(list.length).to.equal(1);
          expect(list[0]).to.deep.equal(proxy2);

          return proxy2.links(link.opposite);
        }).then(function(list) {
          expect(list.length).to.equal(1);
          expect(list[0]).to.deep.equal(proxy);

        });

      });
    });
  }); // end ProxyIdea
}); // end ideas