'use strict';
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const ideas = require('../../../src/database/ideas');
const links = require('../../../src/database/links');
const subgraph = require('../../../src/database/subgraph');

describe('subgraph', function() {
  describe('search', function() {
    it('shapes', bluebird.coroutine(function*() {
      let data = {
        square: { name: 'square' },
        rectangle: { name: 'rectangle' },
        quadrilateral: { name: 'quadrilateral' },
      };

      yield ideas.createGraph(data, [
        ['square', 'type_of', 'rectangle'],
        ['rectangle', 'type_of', 'quadrilateral'],
      ]);

      let sg = new subgraph.units.Subgraph();
      let sg_keys = {};
      sg_keys.s = sg.addVertex(subgraph.matcher.filler);
      sg_keys.r = sg.addVertex(subgraph.matcher.id, data.rectangle);
      sg_keys.q = sg.addVertex(subgraph.matcher.filler);
      sg_keys.s_r = sg.addEdge(sg_keys.s, links.get('type_of'), sg_keys.r);
      sg_keys.r_q = sg.addEdge(sg_keys.r, links.get('type_of'), sg_keys.q, {pref: 1});

      let result = yield subgraph.search(sg);

      // first check the result type (there were lots of problems at first)
      expect(!!result).to.equal(true);
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      result = result[0];

      // now check the result itself
      expect(result).to.not.equal(sg);
      expect(result.concrete).to.equal(true);
      expect(result.getIdea(sg_keys.s)).to.deep.equal(data.square);
      expect(result.getIdea(sg_keys.r)).to.deep.equal(data.rectangle);
      expect(result.getIdea(sg_keys.q)).to.deep.equal(data.quadrilateral);
    }));

    it.skip('no match');
  }); // end search
}); // end subgraph