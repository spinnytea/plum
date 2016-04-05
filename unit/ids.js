'use strict';
const expect = require('chai').expect;
const ids = require('../src/ids');

describe('ids', function() {
  it('init', function() {
    expect(Object.keys(ids.units)).to.deep.equal(['tokens', 'replaceAt', 'increment']);
  });

  it('tokens', function() {
    const tokens = ids.units.tokens;

    // 36 doesn't really matter, but it's good to know
    expect(tokens.length).to.equal(36);

    // not file systems are case sensitive
    // since our primary way of storing data will be to write files, we need to limit our character set
    expect(tokens.map(function(s) { return s.toLowerCase(); })).to.deep.equal(tokens);

    // I like to use underscores for special IDs, so we need to make sure the normally generated IDs can't overlap with them
    expect(tokens.indexOf('a')).to.not.equal(-1); // make sure our search works
    expect(tokens.indexOf('_')).to.equal(-1); // perform the test

    expect(function() { tokens.push('%'); }).to.throw(TypeError);
  });

  it('replaceAt', function() {
    const replaceAt = ids.units.replaceAt;

    expect(replaceAt('1234', 0, 'a')).to.equal('a234');
    expect(replaceAt('1234', 1, 'a')).to.equal('1a34');
    expect(replaceAt('1234', 2, 'a')).to.equal('12a4');
    expect(replaceAt('1234', 3, 'a')).to.equal('123a');
  });

  describe('increment', function() {
    const tokens_bak = ids.units.tokens;
    const increment = ids.units.increment;
    before(function() { ids.units.tokens = ['0', '1', '2']; });
    after(function() { ids.units.tokens = tokens_bak; });

    it('initial', function() {
      expect(increment('')).to.equal('1');
    });

    it('normal', function() {
      expect(increment('0')).to.equal('1');
      expect(increment('1')).to.equal('2');
      expect(increment('10')).to.equal('11');
      expect(increment('11')).to.equal('12');
    });

    it('rollover', function() {
      expect(increment('2')).to.equal('10');
      expect(increment('22')).to.equal('100');
    });
  }); // end increment

  describe('unsupported', function() {
    // sometimes it's good to know what it will do
    it('replaceAt: invalid indexes', function() {
      expect(ids.units.replaceAt('1234', -9, 'a')).to.equal('a1234');
      expect(ids.units.replaceAt('1234',  9, 'a')).to.equal('1234a');
    });

    it('increment: invalid characters', function() {
      expect(ids.units.increment('%')).to.equal('0');
      expect(ids.units.increment('22%', 1)).to.equal('220');
    });
  }); // end unsupported
}); // end ids