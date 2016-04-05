'use strict';
const expect = require('chai').expect;
const links = require('../../src/database/links');

describe('links', function() {
  it('init', function() {
    expect(Object.keys(links.units)).to.deep.equal(['list', 'create']);
  });

  it('list', function() {
    expect(Object.keys(links.units.list)).to.deep.equal(['thought_description', '_test__undirected_', 'type_of', 'property', 'context']);
  });

  describe('create', function() {
    const td = links.get('thought_description');
    const tu = links.get('_test__undirected_');
    const to = links.get('type_of');

    it('directed', function() {
      expect(td.name).to.equal('thought_description');
      expect(td.isOpp).to.equal(false);
      expect(td.opposite).to.not.equal(td);
      expect(td.opposite.name).to.not.equal(td.name);
      expect(td.opposite.isOpp).to.equal(true);
      expect(td.opposite.opposite).to.equal(td);
    });

    it('undirected', function() {
      expect(tu.name).to.equal('_test__undirected_');
      expect(tu.isOpp).to.equal(false);
      expect(tu.opposite).to.equal(tu);
    });

    describe('options', function() {
      it('directed', function() {
        expect(td.options.undirected).to.equal(undefined);
        expect(td.options.directed).to.equal(undefined);
      });

      it('transitive', function() {
        expect(td.options.transitive).to.equal(false);
        expect(to.options.transitive).to.equal(true);
      });
    }); // end options
  }); // end create
}); // end links