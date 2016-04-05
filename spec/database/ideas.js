'use strict';
const expect = require('chai').expect;
const ideas = require('../../src/database/ideas');

describe('ideas', function() {
  it('init', function() {
    expect(Object.keys(ideas)).to.deep.equal([]);
  });
}); // end ideas