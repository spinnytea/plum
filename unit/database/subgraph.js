'use strict';
const expect = require('chai').expect;
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  it('init', function() {
    expect(Object.keys(subgraph.units)).to.deep.equal(['LazyCopyObject', 'Subgraph']);
  });

  describe('LazyCopyObject', function() {
    it('set', function() {
      const lco = new subgraph.units.LazyCopyObject();
      const key = '0';
      expect(lco.data[key]).to.equal(undefined);

      lco.set('0', 0);

      expect(lco.data[key]).to.equal(0);
      expect(lco.get(key)).to.equal(0);
    });

    describe('get', function() {
      describe('no parent', function() {
        const lco = new subgraph.units.LazyCopyObject();
        lco.data['0'] = 0;

        it('found', function() {
          expect(lco.get('0')).to.equal(0);
        });

        it('not found', function() {
          expect(lco.get('1')).to.equal(undefined);
        });
      }); // end no parent

      describe('has parent', function() {
        const lco = new subgraph.units.LazyCopyObject();
        const par = new subgraph.units.LazyCopyObject();
        lco.parent = par;
        lco.data['c'] = 0;
        par.data['p'] = 1;

        it('found local', function() {
          expect(lco.get('c')).to.equal(0);
        });

        it('found in parent', function() {
          expect(lco.get('p')).to.equal(1);
        });

        it('not found', function() {
          expect(lco.get('dne')).to.equal(undefined);
        });

        it('overwritten locally', function() {
          const over = new subgraph.units.LazyCopyObject();
          over.parent = lco;
          over.data['c'] = 2;
          over.data['p'] = 3;
          expect(over.get('c')).to.equal(2);
          expect(over.get('p')).to.equal(3);
        });
      }); // end has parent
    }); // end get
  }); // end LazyCopyObject

  describe('Subgraph', function() {
    it('construct', function() {
      var sg = new subgraph.units.Subgraph();
      expect(sg).to.have.property('_match');
    });

    it.skip('subgraph');
  }); // end Subgraph
}); // end subgraph