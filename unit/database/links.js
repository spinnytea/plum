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
    it('directed', function() {
      let td = links.get('thought_description');
      expect(td.name).to.equal('thought_description');
      expect(td.isOpp).to.equal(false);
      expect(td.opposite.name).to.not.equal(td.name);
      expect(td.opposite.isOpp).to.equal(true);
      expect(td.opposite.opposite).to.equal(td);
    });

    it('undirected', function() {
      let tu = links.get('_test__undirected_');
      expect(tu.name).to.equal('_test__undirected_');
      expect(tu.isOpp).to.equal(false);
      expect(tu.opposite).to.equal(tu);
    });

    it('options', function() {
      let td = links.get('thought_description');
      expect(td.options.transitive).to.equal(false);
      expect(td.options.undirected).to.equal(undefined);
      expect(td.options.directed).to.equal(undefined);

      let to = links.get('type_of');
      expect(to.options.transitive).to.equal(true);
      expect(to.options.undirected).to.equal(undefined);
      expect(to.options.directed).to.equal(undefined);
    });
  }); // end create
}); // end links