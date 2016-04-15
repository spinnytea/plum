'use strict';
const bluebird = require('bluebird');
const expect = require('chai').expect;
const ideas = require('../../src/database/ideas');
const links = require('../../src/database/links');

describe('ideas', function() {
  it('init', function() {
    expect(Object.keys(ideas.units)).to.deep.equal(['memory', 'getID', 'isEmpty', 'ProxyIdea']);
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
    expect(getID({id: '_test'})).to.equal('_test'); // just in case
    expect(getID(new ideas.units.ProxyIdea('_test'))).to.equal('_test');

    expect(function() { getID(); }).to.throw(TypeError);
    expect(function() { getID(1234); }).to.throw(TypeError);
    expect(function() { getID({}); }).to.throw(TypeError);
  });

  it('isEmpty', function() {
    const isEmpty = ideas.units.isEmpty;

    expect(isEmpty({})).to.equal(true);
    expect(isEmpty([])).to.equal(true);
    expect(isEmpty({a:1})).to.equal(false);
    expect(isEmpty([1])).to.equal(false);
  });

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
      return bluebird.coroutine(function*() {
        const link = links.get('thought_description');
        const proxy2 = yield ideas.create();

        // add
        yield proxy.addLink(link, proxy2);
        expect(ideas.units.memory.get(proxy.id).links[link.name]).to.have.property(proxy2.id);
        expect(ideas.units.memory.get(proxy2.id).links[link.opposite.name]).to.have.property(proxy.id);

        // get
        let list = yield proxy.links(link);
        expect(list).to.deep.equal([proxy2]);
        list = yield proxy2.links(link.opposite);
        expect(list).to.deep.equal([proxy]);

        // remove
        yield proxy.removeLink(link, proxy2);
        expect(ideas.units.memory.get(proxy.id).links).to.not.have.property(link.name);
        expect(ideas.units.memory.get(proxy2.id).links).to.not.have.property(link.opposite.name);

        // get
        list = yield proxy.links(link);
        expect(list).to.deep.equal([]);
        list = yield proxy2.links(link.opposite);
        expect(list).to.deep.equal([]);
      })();
    });

    // just in case we try to serialize the data
    it('JSON.stringify', function() {
      const str = JSON.stringify(new ideas.units.ProxyIdea('_test'));
      const obj = {id:'_test'};
      expect(str).to.equal(JSON.stringify(obj));
      expect(JSON.parse(str)).to.deep.equal(obj);
    });
  }); // end ProxyIdea
}); // end ideas