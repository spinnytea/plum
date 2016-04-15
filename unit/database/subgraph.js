'use strict';
const expect = require('chai').expect;
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  it('init', function() {
    expect(Object.keys(subgraph.units)).to.deep.equal(['LazyCopyObject', 'Subgraph']);
  });

  describe('LazyCopyObject', function() {
    describe('get local', function() {
      it.skip('found');

      it.skip('not found');
    }); // end get local

    describe('get parent', function() {
      it.skip('found');

      it.skip('not found');

      it.skip('overwritten locally');
    }); // end get parent
  }); // end LazyCopyObject

  describe('Subgraph', function() {
    it('construct', function() {
      var sg = new subgraph.units.Subgraph();
      expect(sg).to.have.property('_match');
    });

    it.skip('subgraph');
  }); // end Subgraph
}); // end subgraph