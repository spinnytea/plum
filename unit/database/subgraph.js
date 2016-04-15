'use strict';
const expect = require('chai').expect;
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  it('init', function() {
    expect(Object.keys(subgraph.units)).to.deep.equal([]);
  });
}); // end subgraph