'use strict';
const expect = require('chai').expect;
const links = require('../../src/database/links');

describe('links', function() {
  it('init', function() {
    expect(Object.keys(links)).to.deep.equal(['get']);
  });

  it('get', function() {
    expect(links.get('thought_description')).to.equal(links.units.list['thought_description']);
  });
}); // end links