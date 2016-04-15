'use strict';
const expect = require('chai').use(require('chai-as-promised')).expect;
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  it('init', function() {
    expect(Object.keys(subgraph)).to.deep.equal([]);
  });
}); // end subgraph