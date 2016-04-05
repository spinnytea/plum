'use strict';
const expect = require('chai').expect;
const ids = require('../src/ids');

describe('ids', function() {
  it('init', function() {
    expect(Object.keys(ids)).to.deep.equal(['anonymous']);
  });

  it('anonymous', function() {
    expect(ids.anonymous('')).to.equal('1');
    expect(ids.anonymous('12')).to.equal('13');
    expect(ids.anonymous('az')).to.equal('b0');
    expect(ids.anonymous(ids.anonymous(''))).to.equal('2');
  });
}); // end ids