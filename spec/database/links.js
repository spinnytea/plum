'use strict';
const expect = require('chai').expect;
const links = require('../../src/database/links');

describe('links', function() {
  it('get', function() {
    expect(links.get('thought_description')).to.equal(links.units.list['thought_description']);
  });

  it('get opposite', function() {
    const link = links.get('thought_description');
    expect(links.get(link.opposite.name)).to.equal(link.opposite);
  });
}); // end links