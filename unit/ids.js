'use strict';
var expect = require('chai').expect;
var ids = require('../src/ids');

describe('ids', function() {
  it('tokens', function() {
    var tokens = ids.units.tokens;

    // 36 doesn't really matter, but it's good to know
    expect(tokens.length).to.equal(36);

    // not file systems are case sensitive
    // since our primary way of storing data will be to write files, we need to limit our character set
    expect(tokens.map(function(s) { return s.toLowerCase(); })).to.deep.equal(tokens);

    // I like to use underscores for special IDs, so we need to make sure the normally generated IDs can't overlap with them
    expect(tokens.indexOf('a')).to.not.equal(-1); // make sure our search works
    expect(tokens.indexOf('_')).to.equal(-1); // perform the test
  });

  it('replaceAt', function() {
    var replaceAt = ids.units.replaceAt;

    expect(replaceAt('1234', 0, 'a')).to.equal('a234');
    expect(replaceAt('1234', 1, 'a')).to.equal('1a34');
    expect(replaceAt('1234', 2, 'a')).to.equal('12a4');
    expect(replaceAt('1234', 3, 'a')).to.equal('123a');
  });

  describe('increment', function() {
    var tokens_bak;
    var increment = ids.units.increment;
    before(function() {
      tokens_bak = ids.units.tokens;
      ids.units.tokens = ['0', '1', '2'];
    });
    after(function() {
      ids.units.tokens = tokens_bak;
    });

    it('initial', function() {
      expect(increment('')).to.equal('1');
    });

    it('normal', function() {
      expect(increment('0')).to.equal('1');
      expect(increment('1')).to.equal('2');
      expect(increment('10')).to.equal('11');
      expect(increment('11')).to.equal('12');
    });

    it('at position', function() {
      // unit test the recursive case
      expect(increment('100', 2)).to.equal('101');
      expect(increment('100', 1)).to.equal('110');
      expect(increment('100', 0)).to.equal('200');
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
      expect(ids.units.increment('2%2', 1)).to.equal('202');
      expect(ids.units.increment('2%%2', 1)).to.equal('20%2');
    });
  }); // end unsupported
}); // end ids