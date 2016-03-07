'use strict';
var expect = require('chai').expect;
var links = require('../../src/database/links');

describe('links', function() {
  it('init', function() {
    expect(Object.keys(links)).to.deep.equal(['get']);
    expect(Object.keys(links.units)).to.deep.equal(['list', 'create']);
  });

  it('get', function() {
    expect(links.get('thought_description')).to.equal(links.units.list['thought_description']);
  });

  describe('units', function() {
    it('list', function() {
      expect(Object.keys(links.units.list)).to.deep.equal(['thought_description', '_test__undirected_', 'type_of', 'property', 'context']);
    });

    describe('create', function() {
      it('directed', function() {
        var td = links.get('thought_description');
        expect(td.name).to.equal('thought_description');
        expect(td.isOpp).to.equal(false);
        expect(td.opposite.name).to.not.equal(td.name);
        expect(td.opposite.isOpp).to.equal(true);
        expect(td.opposite.opposite).to.equal(td);
      });

      it('undirected', function() {
        var tu = links.get('_test__undirected_');
        expect(tu.name).to.equal('_test__undirected_');
        expect(tu.isOpp).to.equal(false);
        expect(tu.opposite).to.equal(tu);
      });
    }); // end create
  }); // end units
}); // end links