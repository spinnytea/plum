'use strict';
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const ideas = require('../../../src/database/ideas');
const links = require('../../../src/database/links');
const subgraph = require('../../../src/database/subgraph');

// TODO test subgraph.match with subgraph.getData return Promise.reject; it should bubble up to the top as a reject
// TODO test boundaries (move from unit)
describe('subgraph', function() {
  describe('match', function() {
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

      let sg = new subgraph.Subgraph();
      let sg_keys = {};
      sg_keys.s = sg.addVertex(subgraph.matcher.filler);
      sg_keys.r = sg.addVertex(subgraph.matcher.id, data.rectangle);
      sg_keys.q = sg.addVertex(subgraph.matcher.filler);
      sg_keys.s_r = sg.addEdge(sg_keys.s, links.get('type_of'), sg_keys.r);
      sg_keys.r_q = sg.addEdge(sg_keys.r, links.get('type_of'), sg_keys.q, {pref: 1});

      let result = yield subgraph.search(sg);
      expect(result.length).to.equal(1);
      result = result[0];
      expect(result.concrete).to.equal(true);

      let m = new subgraph.Subgraph();
      let m_keys = {};
      m_keys.s = m.addVertex(subgraph.matcher.filler);
      m_keys.r = m.addVertex(subgraph.matcher.exact, { name: 'rectangle' });
      m_keys.s_r = m.addEdge(sg_keys.s, links.get('type_of'), sg_keys.r);

      let match = yield subgraph.match(result, m, false);
      expect(match.length).to.equal(1);
      match = match[0];
      expect(match.v.size).to.equal(2);
      expect(match.v.get(m_keys.s)).to.equal(sg_keys.s);
      expect(match.v.get(m_keys.r)).to.equal(sg_keys.r);
      expect(match.e.size).to.equal(1);
      expect(match.e.get(m_keys.s_r)).to.equal(sg_keys.s_r);
    }));

    //

    describe('boundaries', function() {
      it('dataEquality');

      it('getData');
    }); // end boundaries
  }); // end match
}); // end subgraph