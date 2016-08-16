'use strict';
const _ = require('lodash');
var expect = require('chai').use(require('sinon-chai')).expect;
const sinon = require('sinon');
const ideas = require('../../../src/database/ideas');
const links = require('../../../src/database/links');
const subgraph = require('../../../src/database/subgraph');

/**
 * square - rectangle - parallelogram - quadrilateral
 *         \ rhombus /
 *
 * even though we set up this subgraph, most of the time we shouldn't se it directly
 */
describe('subgraph', function() {
  describe('search', function() {
    let units = {};
    let data = {
      square: { name: 'square' },
      rectangle: { name: 'square' },
      rhombus: { name: 'square' },
      parallelogram: { name: 'square' },
      quadrilateral: { name: 'square' },
    };
    let sg;
    let sg_keys = {};
    before(function() {
      _.assign(units, subgraph.search.units);
      return ideas.createGraph(data, [
        ['square', 'type_of', 'rectangle'],
        ['square', 'type_of', 'rhombus'],
        ['rectangle', 'type_of', 'parallelogram'],
        ['rhombus', 'type_of', 'parallelogram'],
        ['parallelogram', 'type_of', 'quadrilateral'],
      ]);
    });
    after(function() {
      _.assign(subgraph.search.units, units);
      _.values(data).forEach(ideas.delete);
    });
    
    // spy on the functions
    beforeEach(function() {
      _.keys(subgraph.search.units).forEach(function(name) {
        subgraph.search.units[name] = sinon.stub();
      });

      sg = new subgraph.units.Subgraph();
      sg_keys.q = sg.addVertex(subgraph.matcher.id, data.quadrilateral);
      sg_keys.p = sg.addVertex(subgraph.matcher.filler);
      sg_keys.r = sg.addVertex(subgraph.matcher.id, data.rectangle);
      sg_keys.h = sg.addVertex(subgraph.matcher.filler);
      sg_keys.s = sg.addVertex(subgraph.matcher.filler);
      sg_keys.s_r = sg.addEdge(sg_keys.s, links.get('type_of'), sg_keys.r);
      sg_keys.s_h = sg.addEdge(sg_keys.s, links.get('type_of'), sg_keys.h);
      sg_keys.r_p = sg.addEdge(sg_keys.r, links.get('type_of'), sg_keys.p);
      sg_keys.h_p = sg.addEdge(sg_keys.h, links.get('type_of'), sg_keys.p);
      sg_keys.p_q = sg.addEdge(sg_keys.p, links.get('type_of'), sg_keys.q);
    });

    it.skip('edge order');

    describe('findEdgeToExpand', function() {
      const edges = [3, 3, 3, 2, 2, 1, 0].map(function(pref) { return { options: { pref: pref } }; });
      function best(idx) {
        subgraph.search.units.updateSelected.returnsArg(2);
        subgraph.search.units.updateSelected.onCall(idx).returns({ edge: edges[idx] });
      }

      it('no edges', function() {
        best(-1);

        const result = units.findEdgeToExpand(sg, []);

        expect(!!result).to.equal(false);
        expect(subgraph.search.units.updateSelected).to.have.callCount(0);
      });

      it('exit early (three)', function() {
        best(0);

        const result = units.findEdgeToExpand(sg, edges);

        expect(!!result).to.equal(true);
        expect(result.edge).to.equal(edges[0]);
        expect(subgraph.search.units.updateSelected).to.have.callCount(3);
      });

      it('exit early (two)', function() {
        best(3);

        const result = units.findEdgeToExpand(sg, edges);

        expect(!!result).to.equal(true);
        expect(result.edge).to.equal(edges[3]);
        expect(subgraph.search.units.updateSelected).to.have.callCount(5);
      });

      it('save the best for last', function() {
        best(6);

        const result = units.findEdgeToExpand(sg, edges);

        expect(!!result).to.equal(true);
        expect(result.edge).to.equal(edges[6]);
        expect(subgraph.search.units.updateSelected).to.have.callCount(7);
      });
    }); // end findEdgeToExpand

    describe('updateSelected', function() {
      it.skip('test it');
    }); // end updateSelected

    describe('getBranches', function() {
      it.skip('test it');
    }); // end getBranches

    describe('verifyEdges', function() {
      it.skip('test it');
    }); // end verifyEdges

    describe('verifyEdge', function() {
      it.skip('test it');
    }); // end verifyEdge

    describe('expandEdge', function() {
      it.skip('test it');
    }); // end expandEdge
  }); // end search
}); // end subgraph