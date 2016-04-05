'use strict';
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-as-promised')).expect;
const config = require('../src/config');
const ids = require('../src/ids');

describe('ids', function() {
  const NEXT_ID = 'my_key';
  function cleanup(result) {
    if(config.units.data.hasOwnProperty('ids')) {
      delete config.units.data['ids'][NEXT_ID];
    }
    return result;
  }

  beforeEach(invariants);
  afterEach(invariants);
  function invariants() {
    if(config.units.data.hasOwnProperty('ids')) {
      expect(config.units.data['ids']).to.not.have.property(NEXT_ID);
    }
  }

  //

  it('init', function() {
    expect(Object.keys(ids)).to.deep.equal(['anonymous', 'next']);
  });

  it('anonymous', function() {
    expect(ids.anonymous('')).to.equal('1');
    expect(ids.anonymous('12')).to.equal('13');
    expect(ids.anonymous('az')).to.equal('b0');
    expect(ids.anonymous(ids.anonymous(''))).to.equal('2');
  });

  it('next (one)', function() {
    return expect(ids.next(NEXT_ID).then(cleanup)).to.eventually.equal('1');
  });

  it.skip('next (many)', function() {
    var promises = new Array(5).map(function() { return ids.next(NEXT_ID); });
    return expect(bluebird.all(promises).then(cleanup)).to.eventually.deep.equal(['1', '2', '3', '4', '5']);
  });
}); // end ids