'use strict';
const _ = require('lodash');
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const sinon = require('sinon');
const ideas = require('../../../src/database/ideas');
const links = require('../../../src/database/links');
const subgraph = require('../../../src/database/subgraph');

function makeEdges(prefs) {
  return prefs.map(function(pref) { return { options: { pref: pref } }; });
}

/**
 * type_of
 * square - rectangle - parallelogram - quadrilateral
 *         \ rhombus /
 *
 * property
 * rectangle - height
 *            \ width
 *
 * even though we set up this subgraph, some of the tests don't actually use it
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
      width: { name: 'width' },
      height: { name: 'height' },
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
        ['rectangle', 'property', 'width'],
        ['rectangle', 'property', 'height'],
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
      sg_keys.s = sg.addVertex(subgraph.matcher.exact, {name:'square'});
      sg_keys.h = sg.addVertex(subgraph.matcher.filler);
      sg_keys.r = sg.addVertex(subgraph.matcher.id, data.rectangle);
      sg_keys.p = sg.addVertex(subgraph.matcher.id, data.parallelogram);
      sg_keys.q = sg.addVertex(subgraph.matcher.filler);
      sg_keys.wi = sg.addVertex(subgraph.matcher.id, data.width);
      sg_keys.hi = sg.addVertex(subgraph.matcher.filler);
      sg_keys.s_r = sg.addEdge(sg_keys.s, links.get('type_of'), sg_keys.r);
      sg_keys.s_h = sg.addEdge(sg_keys.s, links.get('type_of'), sg_keys.h);
      sg_keys.r_p = sg.addEdge(sg_keys.r, links.get('type_of'), sg_keys.p);
      sg_keys.h_p = sg.addEdge(sg_keys.h, links.get('type_of'), sg_keys.p);
      sg_keys.p_q = sg.addEdge(sg_keys.p, links.get('type_of'), sg_keys.q);
      sg_keys.r_wi = sg.addEdge(sg_keys.r, links.get('property'), sg_keys.wi);
      sg_keys.r_hi = sg.addEdge(sg_keys.r, links.get('property'), sg_keys.hi);
    });

    describe('search', function() {
      it('noop concrete', function() {
        const sg = { concrete: true };
        return subgraph.search(sg).then(function(result) {
          expect(result).to.deep.equal([sg]);
          expect(result[0]).to.equal(sg);
        });
      });

      it('edge order', function() {
        const edges = makeEdges([1,0,2,0,3,0,4]);
        const sg = { allEdges: ()=>(edges), copy: ()=>('copy') };

        subgraph.search(sg);

        const stub = subgraph.search.units.recursiveSearch;
        expect(stub).to.have.callCount(1);
        expect(stub.firstCall.args).to.deep.equal(['copy', makeEdges([4,3,2,1,0,0,0])]);
      });
    }); // end search

    describe('recursiveSearch', function() {
      it('invalid edges', function() {
        subgraph.search.units.verifyEdges.returns(Promise.resolve(undefined));

        return units.recursiveSearch().then(function(result) {
          expect(result).to.deep.equal([]);
          expect(subgraph.search.units.verifyEdges).to.have.callCount(1);
          expect(subgraph.search.units.findEdgeToExpand).to.have.callCount(0);
          expect(subgraph.search.units.expandEdge).to.have.callCount(0);
          expect(subgraph.search.units.recursiveSearch).to.have.callCount(0);
        });
      });

      it('no edge selected', function() {
        const edges = ['a','b'];
        subgraph.search.units.verifyEdges.returns(Promise.resolve(edges));
        subgraph.search.units.findEdgeToExpand.returns(Promise.resolve(undefined));

        return units.recursiveSearch(sg, edges).then(function(result) {
          expect(result).to.deep.equal([]);
          expect(subgraph.search.units.verifyEdges).to.have.callCount(1);
          expect(subgraph.search.units.findEdgeToExpand).to.have.callCount(1);
          expect(subgraph.search.units.expandEdge).to.have.callCount(0);
          expect(subgraph.search.units.recursiveSearch).to.have.callCount(0);
        });
      });

      it('no next steps', function() {
        const edges = ['a','b'];
        subgraph.search.units.verifyEdges.returns(Promise.resolve(edges));
        subgraph.search.units.findEdgeToExpand.returns(Promise.resolve({edge:'a'}));
        subgraph.search.units.expandEdge.returns(Promise.resolve([]));

        return units.recursiveSearch(sg, edges).then(function(result) {
          expect(result).to.deep.equal([]);
          expect(subgraph.search.units.verifyEdges).to.have.callCount(1);
          expect(subgraph.search.units.findEdgeToExpand).to.have.callCount(1);
          expect(subgraph.search.units.expandEdge).to.have.callCount(1);
          expect(subgraph.search.units.recursiveSearch).to.have.callCount(0);
        });
      });

      it('has next steps', function() {
        const edges = ['a','b'];
        subgraph.search.units.verifyEdges.returns(Promise.resolve(edges));
        subgraph.search.units.findEdgeToExpand.returns(Promise.resolve({edge:'a'}));
        subgraph.search.units.expandEdge.returns(Promise.resolve([1,2,3]));
        subgraph.search.units.recursiveSearch.returns(Promise.resolve(['recursive result']));

        return units.recursiveSearch(sg, edges).then(function(result) {
          expect(result).to.deep.equal(['recursive result', 'recursive result', 'recursive result']);
          expect(subgraph.search.units.verifyEdges).to.have.callCount(1);
          expect(subgraph.search.units.findEdgeToExpand).to.have.callCount(1);
          expect(subgraph.search.units.expandEdge).to.have.callCount(1);
          expect(subgraph.search.units.recursiveSearch).to.have.callCount(3);
          expect(subgraph.search.units.recursiveSearch).to.have.been.calledWithExactly(1, ['b']);
          expect(subgraph.search.units.recursiveSearch).to.have.been.calledWithExactly(2, ['b']);
          expect(subgraph.search.units.recursiveSearch).to.have.been.calledWithExactly(3, ['b']);
        });
      });

      it('base case', function() {
        const edges = []; // no more edges left
        subgraph.search.units.verifyEdges.returns(Promise.resolve(edges));
        subgraph.search.units.findEdgeToExpand.returns(Promise.resolve({edge:'a'}));
        subgraph.search.units.expandEdge.returns(Promise.resolve([]));
        sg._vertexCount = sg._idea.size; // pretend we found them all

        return units.recursiveSearch(sg, edges).then(function(result) {
          expect(result).to.deep.equal([sg]);
          expect(sg.concrete).to.equal(true);
          expect(subgraph.search.units.verifyEdges).to.have.callCount(1);
          expect(subgraph.search.units.findEdgeToExpand).to.have.callCount(1);
          expect(subgraph.search.units.expandEdge).to.have.callCount(1);
          expect(subgraph.search.units.recursiveSearch).to.have.callCount(0);
        });
      });
    }); // end recursiveSearch

    describe('verifyEdges', function() {
      const sg = {
        hasIdea: function(id) { return id < 4; }
      };
      const edges = [
        { src: 1, dst: 2 },
        { src: 1, dst: 3 },
        { src: 2, dst: 3 },
        { src: 3, dst: 4 },
        { src: 4, dst: 5 },
        { src: 3, dst: 5 },
      ];

      it('all valid', function() {
        subgraph.search.units.verifyEdge.returns(Promise.resolve(true));

        return units.verifyEdges(sg, edges).then(function(result) {
          expect(edges.length).to.equal(6);
          expect(result.length).to.equal(3);
          expect(subgraph.search.units.verifyEdge).to.have.callCount(3);
          expect(subgraph.search.units.verifyEdge).to.have.been.calledWithExactly(sg, edges[0]);
          expect(subgraph.search.units.verifyEdge).to.have.been.calledWithExactly(sg, edges[1]);
          expect(subgraph.search.units.verifyEdge).to.have.been.calledWithExactly(sg, edges[2]);
          expect(subgraph.search.units.verifyEdge).to.not.have.been.calledWithExactly(sg, edges[3]);
          expect(subgraph.search.units.verifyEdge).to.not.have.been.calledWithExactly(sg, edges[4]);
          expect(subgraph.search.units.verifyEdge).to.not.have.been.calledWithExactly(sg, edges[5]);
        });
      });

      it('some invalid', function() {
        subgraph.search.units.verifyEdge.returns(Promise.resolve(false));
        return units.verifyEdges(sg, edges).then(function(result) {
          expect(edges.length).to.equal(6);
          expect(result).to.equal(undefined);
          expect(subgraph.search.units.verifyEdge).to.have.callCount(3);
        });
      });
    }); // end verifyEdges

    describe('verifyEdge', function() {
      // Note: we only need to check edges that have both a src and a dst
      it('short transitive valid', function() {
        return units.verifyEdge(sg, sg.getEdge(sg_keys.r_p)).then(function(result) {
          expect(result).to.equal(true);
        });
      });

      it('long transitive', function() {
        // let's set the square and rhombus
        sg._idea.set(sg_keys.s, data.square);
        sg._idea.set(sg_keys.h, data.quadrilateral);
        // if we look at this specific link, it looks like the graph could be
        return units.verifyEdge(sg, sg.getEdge(sg_keys.s_h)).then(function(result) {
          expect(result).to.equal(true);

          // now let's look at a different link
          // this isn't a valid edge
          return units.verifyEdge(sg, sg.getEdge(sg_keys.h_p));
        }).then(function(result) {
          expect(result).to.equal(false);
        });
      });

      // make a rock/paper/scissors graph?
      it.skip('transitive circular links');

      it('!transitive valid', function() {
        return units.verifyEdge(sg, sg.getEdge(sg_keys.r_wi)).then(function(result) {
          expect(result).to.equal(true);
        });
      });

      it('!transitive invalid', function() {
        // a quadrilateral is not valid for a height
        sg._idea.set(sg_keys.hi, data.quadrilateral);
        return units.verifyEdge(sg, sg.getEdge(sg_keys.r_hi)).then(function(result) {
          expect(result).to.equal(false);
        });
      });
    }); // end verifyEdge

    describe('findEdgeToExpand', function() {
      const edges = makeEdges([3, 3, 3, 2, 2, 1, 0]);
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
      function select(branches, pref) {
        return {
          edge: { src: 0, dst: 0, options: { pref: pref } },
          branches: new Array(branches).fill(null),
          isForward: true,
        };
      }
      beforeEach(function() {
        // call through
        subgraph.search.units.getBranches = units.getBranches;
      });

      it('pick the edge with fewer branches', function() {
        // if we have something selected that has a high branching factor, then switch
        let selected = select(100, 0);
        return units.updateSelected(sg, sg.getEdge(sg_keys.s_r), selected).then(function(result) {
        expect(result.edge).to.equal(sg.getEdge(sg_keys.s_r));

          // if we start with something of equal or lower, then keep what we have
        selected = select(1, 0);
          return units.updateSelected(sg, sg.getEdge(sg_keys.s_r), selected);
        }).then(function(result) {
        expect(result).to.equal(selected);
        });
      });

      it('pick the edge with the higher pref', function() {
        // it doesn't matter what the branching factor is if we've said we should expand this one first
        let selected = select(100, 10);
        return units.updateSelected(sg, sg.getEdge(sg_keys.p_q), selected).then(function(result) {
        expect(result).to.equal(selected);

          // switch to a different edge if it's got a better pref
        selected = select(1, -1);
          return units.updateSelected(sg, sg.getEdge(sg_keys.p_q), selected);
        }).then(function(result) {
        expect(result.edge).to.equal(sg.getEdge(sg_keys.p_q));
        });
      });

      it('ignore edges without src or dst', function() {
        let selected = select(100, -1);
        return units.updateSelected(sg, sg.getEdge(sg_keys.s_h), selected).then(function(result) {
        expect(result).to.equal(selected);
        });
      });

      it('ignore edges with src or dst', function() {
        let selected = select(100, -1);
        return units.updateSelected(sg, sg.getEdge(sg_keys.r_p), selected).then(function(result) {
        expect(result).to.equal(selected);
        });
      });

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

      it('!transitive isForward', function() {
        return units.getBranches(sg, sg.getEdge(sg_keys.r_wi), true).then(function(branches) {
          expect(branches.length).to.equal(2);
          expect(branches).to.include(data.width);
          expect(branches).to.include(data.height);
        });
      });

      it('!transitive !isForward', function() {
        return units.getBranches(sg, sg.getEdge(sg_keys.r_wi), false).then(function(branches) {
          expect(branches.length).to.equal(1);
          expect(branches).to.include(data.rectangle);
        });
      });
    }); // end getBranches

    describe('expandEdge', function() {
      // takes the place of units.updateSelected
      // we can also "select" edges where both src and dst have ids
      const select = bluebird.coroutine(function*(vertex_id) {
        const selected = { edge: sg.getEdge(vertex_id) };
        selected.isForward = sg.hasIdea(selected.edge.src);
        selected.branches = yield units.getBranches(sg, selected.edge, selected.isForward);
        return selected;
      });

      it.skip('pointer uses target idea data');

      describe('matcher', function() {
        it('id', bluebird.coroutine(function*() {
          const selected = yield select(sg_keys.r_p);
          expect(selected.branches.length).to.equal(2); // there are two things linked
          expect(sg.getMatch(selected.edge.dst).matcher).to.equal(subgraph.matcher.id);
          sinon.stub(selected.branches, 'filter', selected.branches.filter);
          sinon.spy(selected.branches, 'map');

          const branches = yield units.expandEdge(sg, selected);

          expect(branches.length).to.equal(1); // only one is a match
          expect(selected.branches.filter).to.have.callCount(1);
          expect(selected.branches.map).to.have.callCount(0);
        }));

        it('filler', bluebird.coroutine(function*() {
          const selected = yield select(sg_keys.p_q);
          expect(selected.branches.length).to.equal(1); // only one thing is linked
          expect(sg.getMatch(selected.edge.dst).matcher).to.equal(subgraph.matcher.filler);
          sinon.spy(selected.branches, 'filter');
          sinon.spy(selected.branches, 'map');

          const branches = yield units.expandEdge(sg, selected);

          expect(branches.length).to.equal(1);
          expect(selected.branches.filter).to.have.callCount(0);
          expect(selected.branches.map).to.have.callCount(0);
        }));

        it('any data', bluebird.coroutine(function*() {
          const selected = yield select(sg_keys.s_r);
          expect(selected.branches.length).to.equal(1);
          expect(sg.getMatch(selected.edge.src).matcher).to.equal(subgraph.matcher.exact);
          sinon.spy(selected.branches, 'filter');
          sinon.stub(selected.branches, 'map', selected.branches.map);

          const branches = yield units.expandEdge(sg, selected);

          expect(branches.length).to.equal(1);
          expect(selected.branches.filter).to.have.callCount(0);
          expect(selected.branches.map).to.have.callCount(1);
        }));
      }); // end matcher

      describe('branches', function() {
        it('none', bluebird.coroutine(function*() {
          const selected = yield select(sg_keys.s_r);
          selected.branches = [data.quadrilateral]; // change the branches to something that won't match
          const branches = yield units.expandEdge(sg, selected);

          expect(branches.length).to.equal(0);
        }));

        it('one', bluebird.coroutine(function*() {
          const selected = yield select(sg_keys.s_r);
          const branches = yield units.expandEdge(sg, selected);

          // change subgraph directly
          expect(branches.length).to.equal(1);
          expect(branches[0]).to.equal(sg);

          const matchedIdeas = branches.map((s)=>s.getIdea(sg_keys.s));
          expect(matchedIdeas).to.include(data.square);
        }));

        it('multiple', bluebird.coroutine(function*() {
          const selected = yield select(sg_keys.h_p);
          const branches = yield units.expandEdge(sg, selected);

          // copy the subgraph
          // let the last one carry through
          expect(branches.length).to.equal(3);
          expect(branches[0]).to.not.equal(sg);
          expect(branches[1]).to.not.equal(sg);
          expect(branches[2]).to.equal(sg);

          const matchedIdeas = branches.map((s)=>s.getIdea(sg_keys.h));
          expect(matchedIdeas).to.include(data.square);
          expect(matchedIdeas).to.include(data.rectangle);
          expect(matchedIdeas).to.include(data.rhombus);
        }));
      }); // end branches
    }); // end expandEdge
  }); // end search
}); // end subgraph