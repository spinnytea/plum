'use strict';
const _ = require('lodash');
var expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
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
      rectangle: { name: 'rectangle' },
      rhombus: { name: 'rhombus' },
      parallelogram: { name: 'parallelogram' },
      quadrilateral: { name: 'quadrilateral' },
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
      sg_keys.q = sg.addVertex(subgraph.matcher.filler);
      sg_keys.p = sg.addVertex(subgraph.matcher.id, data.parallelogram);
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
      function setupBest(idx) {
        subgraph.search.units.updateSelected = function() {
          if(idx === subgraph.search.units.updateSelected.callCount++)
            return Promise.resolve({ edge: edges[idx] });
          return Promise.resolve(arguments[2]);
        };
        subgraph.search.units.updateSelected.callCount = 0;
      }

      it('no edges', function() {
        setupBest(-1);
        return units.findEdgeToExpand(sg, []).then(function(result) {
          expect(!!result).to.equal(false);
          expect(subgraph.search.units.updateSelected.callCount).to.equal(0);
        });
      });

      it('exit early (three)', function() {
        setupBest(0);
        return units.findEdgeToExpand(sg, edges).then(function(result) {
          expect(!!result).to.equal(true);
          expect(result.edge).to.equal(edges[0]);
          expect(subgraph.search.units.updateSelected.callCount).to.equal(3);
        });
      });

      it('exit early (two)', function() {
        setupBest(3);
        return units.findEdgeToExpand(sg, edges).then(function(result) {
          expect(!!result).to.equal(true);
          expect(result.edge).to.equal(edges[3]);
          expect(subgraph.search.units.updateSelected.callCount).to.equal(5);
        });
      });

      it('save the best for last', function() {
        setupBest(6);
        return units.findEdgeToExpand(sg, edges).then(function(result) {
          expect(!!result).to.equal(true);
          expect(result.edge).to.equal(edges[6]);
          expect(subgraph.search.units.updateSelected.callCount).to.equal(7);
        });
      });
    }); // end findEdgeToExpand

    describe('updateSelected', function() {
      it.skip('pick the edge with fewer branches');

      it.skip('pick the edge with the higher pref');

      it.skip('dont pick a lower pref');

      it.skip('ignore edges without src or dst');

      it.skip('ignore edges with src or dst');

      it.skip('ignore pointers that whos dst is undefined');
    }); // end updateSelected

    describe('getBranches', function() {
      it('transitive isForward', function() {
        return units.getBranches(sg, sg.getEdge(sg_keys.r_p), true).then(function(branches) {
          expect(branches.length).to.equal(2);
          expect(branches).to.include(data.quadrilateral);
          expect(branches).to.include(data.parallelogram);
        });
      });

      it('transitive !isForward', function() {
        return units.getBranches(sg, sg.getEdge(sg_keys.r_p), false).then(function(branches) {
          expect(branches.length).to.equal(3);
          expect(branches).to.include(data.rectangle);
          expect(branches).to.include(data.square);
          expect(branches).to.include(data.rhombus);
        });
      });

      it.skip('!transitive isForward');

      it.skip('!transitive !isForward');
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