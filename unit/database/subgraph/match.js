'use strict';
const _ = require('lodash');
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const sinon = require('sinon');
const subgraph = require('../../../src/database/subgraph');

describe('subgraph', function() {
  describe('match', function() {
    const units = _.assign({}, subgraph.match.units);
    const boundaries = _.assign({}, subgraph.match.boundaries);
    after(function() {
      _.assign(subgraph.match.units, units);
      _.assign(subgraph.match.boundaries, boundaries);
    });
    beforeEach(function() {
      // spy on the functions
      _.keys(subgraph.match.units).forEach(function(name) {
        subgraph.match.units[name] = sinon.stub();
      });
      _.keys(subgraph.match.boundaries).forEach(function(name) {
        subgraph.match.boundaries[name] = sinon.stub();
      });
    });

    // XXX use this in more tests instead of making it from scratch
    function setupMetadata() {
      function e(src, link, dst) { return { src: src, link: { name: link }, dst: dst }; }

      const outer = { allEdges: function() { return [
        e('A', 'l1', 'B'), e('B', 'l1', 'C'), e('A', 'l1', 'C'),
        e('D', 'l2', 'E'), e('E', 'l2', 'F'), e('D', 'l2', 'F'),
      ]; } };
      const inner = { allEdges: function() { return [
        e('a', 'l1', 'b'), e('b', 'l1', 'c'), e('a', 'l1', 'c'),
      ]; } };
      const vertexMap = new Map();
      vertexMap.set('a', 'A');

      return new units.SubgraphMatchMetadata(outer, inner, vertexMap, true);
    }

    // Note: this function is all integration
    describe('match', function() {
      it('outer concrete', function() {
        expect(function() { units.match({ concrete: false }); }).to.throw('the outer subgraph must be concrete');
      });

      it('inner vertices', function() {
        return units.match({ concrete: true }, { _vertexCount: 0 }).then(function(result) {
          expect(result).to.deep.equal([]);
          expect(subgraph.match.units.initializeVertexMap).to.have.callCount(0);
          expect(subgraph.match.units.SubgraphMatchMetadata).to.have.callCount(0);
          expect(subgraph.match.units.recursiveMatch).to.have.callCount(0);
        });
      });

      it('inner has more vertices', function() {
        return units.match({ concrete: true, _vertexCount: 3 }, { _vertexCount: 6 }).then(function(result) {
          expect(result).to.deep.equal([]);
          expect(subgraph.match.units.initializeVertexMap).to.have.callCount(0);
          expect(subgraph.match.units.SubgraphMatchMetadata).to.have.callCount(0);
          expect(subgraph.match.units.recursiveMatch).to.have.callCount(0);
        });
      });

      it('inner has more edges', function() {
        return units.match({ concrete: true, _vertexCount: 6, _edgeCount: 3 }, { _vertexCount: 3, _edgeCount: 6 }).then(function(result) {
          expect(result).to.deep.equal([]);
          expect(subgraph.match.units.initializeVertexMap).to.have.callCount(0);
          expect(subgraph.match.units.SubgraphMatchMetadata).to.have.callCount(0);
          expect(subgraph.match.units.recursiveMatch).to.have.callCount(0);
        });
      });

      it('bad vertexMap', function() {
        let outer = { concrete: true, _vertexCount: 6, _edgeCount: 6 };
        let inner = { _vertexCount: 3, _edgeCount: 3 };
        subgraph.match.units.initializeVertexMap.returns(Promise.resolve(undefined));
        return units.match(outer, inner).then(function(result) {
          expect(result).to.deep.equal([]);
          expect(subgraph.match.units.initializeVertexMap).to.have.callCount(1);
          expect(subgraph.match.units.initializeVertexMap).to.have.calledWith(outer, inner, false);
          expect(subgraph.match.units.SubgraphMatchMetadata).to.have.callCount(0);
          expect(subgraph.match.units.recursiveMatch).to.have.callCount(0);
        });
      });

      it('success', function() {
        let outer = { concrete: true, _vertexCount: 6, _edgeCount: 6 };
        let inner = { _vertexCount: 3, _edgeCount: 3 };
        let vertexMap = new Map();
        subgraph.match.units.initializeVertexMap.returns(Promise.resolve(vertexMap));
        // subgraph.match.units.SubgraphMatchMetadata.returns('metadata');
        subgraph.match.units.recursiveMatch.returns(Promise.resolve(['something']));
        return units.match(outer, inner).then(function(result) {
          expect(result).to.deep.equal(['something']);
          expect(subgraph.match.units.initializeVertexMap).to.have.callCount(1);
          expect(subgraph.match.units.initializeVertexMap).to.have.calledWith(outer, inner, false);
          expect(subgraph.match.units.SubgraphMatchMetadata).to.have.callCount(1);
          expect(subgraph.match.units.SubgraphMatchMetadata).to.have.calledWith(outer, inner, vertexMap, false);
          expect(subgraph.match.units.recursiveMatch).to.have.callCount(1);
          // expect(subgraph.match.units.recursiveMatch).to.have.calledWith('metadata');
        });
      });
    }); // end match

    // Note: this function is all integration
    describe('recursiveMatch', function() {
      describe('base case', function() {
        const metadata = {};
        beforeEach(function() {
          metadata.innerEdges = [];
          metadata.vertexMap = new Map();
          metadata.vertexMap.set('a', 'A');
          metadata.inner = { _vertexCount: 0 };
        });

        it('done', function() {
          metadata.inner._vertexCount = 1;
          return units.recursiveMatch(metadata).then(function(result) {
            expect(result).to.deep.equal([{ v: metadata.vertexMap, e: metadata.edgeMap }]);
          });
        });

        it('not done', function() {
          metadata.inner._vertexCount = 2;
          return units.recursiveMatch(metadata).then(function(result) {
            expect(result).to.deep.equal([]);
          });
        });
      }); // end base case

      describe('no outer', function() {
        let metadata;
        beforeEach(function() {
          metadata = setupMetadata();

          metadata.nextInnerEdge = function() { return metadata.innerEdges[0]; };
          metadata.nextOuterEdges = function() { return Promise.resolve([]); };
          subgraph.match.units.recursiveMatch.returns(['mock recursiveMatch']);
        });

        it('skip edge', function() {
          metadata.inner.getMatch = function() { return { options: { pointer: true } }; };
          expect(metadata.skipThisTime.size).to.equal(0);
          return units.recursiveMatch(metadata).then(function(result) {
            expect(result).to.deep.equal(['mock recursiveMatch']);
            expect(metadata.skipThisTime.size).to.equal(1);
            expect(subgraph.match.units.recursiveMatch).to.have.callCount(1);
          });
        });

        it('dead end', function() {
          metadata.inner.getMatch = function() { return { options: { pointer: false } }; };
          expect(metadata.skipThisTime.size).to.equal(0);
          return units.recursiveMatch(metadata).then(function(result) {
            expect(result).to.deep.equal([]);
            expect(metadata.skipThisTime.size).to.equal(0);
            expect(subgraph.match.units.recursiveMatch).to.have.callCount(0);
          });
        });
      }); // end no outer

      describe('recurse', function() {
        let metadata;
        let outerEdges;
        beforeEach(function() {
          metadata = setupMetadata();
          metadata.nextInnerEdge = function() { return metadata.innerEdges[0]; };
          spyOnMeta(metadata);

          outerEdges = metadata.outerEdges.get('l1');

          subgraph.match.units.recursiveMatch.returns(['mock recursiveMatch']);
        });
        function spyOnMeta(meta) {
          meta.removeOuterEdge = sinon.spy();
          meta.updateVertexMap = sinon.spy();
          meta.clone = sinon.stub();
          return meta;
        }
        function check(meta, inner, outer) {
          expect(meta.removeOuterEdge).to.have.callCount(1);
          expect(meta.removeOuterEdge).to.have.been.calledWithExactly(outer);
          expect(meta.updateVertexMap).to.have.callCount(1);
          expect(meta.updateVertexMap).to.have.been.calledWithExactly(inner, outer);
        }

        it('one', function() {
          const innerEdge = metadata.innerEdges[0];
          metadata.nextOuterEdges = function() { return Promise.resolve([outerEdges[0]]); };
          return units.recursiveMatch(metadata).then(function(result) {
            expect(result).to.deep.equal(['mock recursiveMatch']);
            expect(subgraph.match.units.recursiveMatch).to.have.callCount(1);

            expect(metadata.clone).to.have.callCount(0);
            check(metadata, innerEdge, outerEdges[0]);
          });
        });

        it('two', function() {
          const innerEdge = metadata.innerEdges[0];
          const branches = [spyOnMeta({}), metadata];
          metadata.clone.onCall(0).returns(branches[0]);
          metadata.clone.onCall(1).returns(branches[1]);
          metadata.nextOuterEdges = function() { return Promise.resolve([outerEdges[0], outerEdges[1]]); };
          return units.recursiveMatch(metadata).then(function(result) {
            expect(result).to.deep.equal(['mock recursiveMatch', 'mock recursiveMatch']);
            expect(subgraph.match.units.recursiveMatch).to.have.callCount(2);

            expect(metadata.clone).to.have.callCount(1);
            check(branches[0], innerEdge, outerEdges[0]);
            check(branches[1], innerEdge, outerEdges[1]);
          });
        });

        it('three', function() {
          const innerEdge = metadata.innerEdges[0];
          const branches = [spyOnMeta({}), spyOnMeta({}), metadata];
          metadata.clone.onCall(0).returns(branches[0]);
          metadata.clone.onCall(1).returns(branches[1]);
          metadata.clone.onCall(2).returns(branches[2]);
          metadata.nextOuterEdges = function() { return Promise.resolve([outerEdges[0], outerEdges[1], outerEdges[2]]); };
          return units.recursiveMatch(metadata).then(function(result) {
            expect(result).to.deep.equal(['mock recursiveMatch', 'mock recursiveMatch', 'mock recursiveMatch']);
            expect(subgraph.match.units.recursiveMatch).to.have.callCount(3);

            expect(metadata.clone).to.have.callCount(2);
            check(branches[0], innerEdge, outerEdges[0]);
            check(branches[1], innerEdge, outerEdges[1]);
            check(branches[2], innerEdge, outerEdges[2]);
          });
        });
      }); // end recurse
    }); // end recursiveMatch

    describe('SubgraphMatchMetadata', function() {
      let metadata;
      beforeEach(function() {
        metadata = setupMetadata();

        metadata.edgeMap.set(1, 2);
        metadata.skipThisTime.add(3);
      });

      it('constructor', function() {
        expect(metadata.outer).to.not.equal(undefined);
        expect(metadata.inner).to.not.equal(undefined);
        expect(metadata.unitsOnly).to.equal(true);
        expect(Array.from(metadata.outerEdges.entries())).to.deep.equal([
          ['l1', [{ src: 'A', link: { name: 'l1' }, dst: 'B' }, { src: 'B', link: { name: 'l1' }, dst: 'C' }, { src: 'A', link: { name: 'l1' }, dst: 'C' }]],
          ['l2', [{ src: 'D', link: { name: 'l2' }, dst: 'E' }, { src: 'E', link: { name: 'l2' }, dst: 'F' }, { src: 'D', link: { name: 'l2' }, dst: 'F' }]]
        ]);
        expect(metadata.innerEdges).to.deep.equal([
          { src: 'a', link: { name: 'l1' }, dst: 'b' },
          { src: 'b', link: { name: 'l1' }, dst: 'c' },
          { src: 'a', link: { name: 'l1' }, dst: 'c' }
        ]);
        expect(Array.from(metadata.vertexMap.entries())).to.deep.equal([['a', 'A']]);
        expect(Array.from(metadata.inverseMap.entries())).to.deep.equal([['A', 'a']]);
        expect(Array.from(metadata.edgeMap.entries())).to.deep.equal([[1, 2]]);
        expect(Array.from(metadata.skipThisTime.values())).to.deep.equal([3]);
      });

      it('clone', function() {
        const clone = metadata.clone();

        // Note: copied directly from above
        expect(clone.outer).to.not.equal(undefined);
        expect(clone.inner).to.not.equal(undefined);
        expect(clone.unitsOnly).to.equal(true);
        expect(Array.from(clone.outerEdges.entries())).to.deep.equal([
          ['l1', [{ src: 'A', link: { name: 'l1' }, dst: 'B' }, { src: 'B', link: { name: 'l1' }, dst: 'C' }, { src: 'A', link: { name: 'l1' }, dst: 'C' }]],
          ['l2', [{ src: 'D', link: { name: 'l2' }, dst: 'E' }, { src: 'E', link: { name: 'l2' }, dst: 'F' }, { src: 'D', link: { name: 'l2' }, dst: 'F' }]]
        ]);
        expect(clone.innerEdges).to.deep.equal([
          { src: 'a', link: { name: 'l1' }, dst: 'b' },
          { src: 'b', link: { name: 'l1' }, dst: 'c' },
          { src: 'a', link: { name: 'l1' }, dst: 'c' }
        ]);
        expect(Array.from(clone.vertexMap.entries())).to.deep.equal([['a', 'A']]);
        expect(Array.from(clone.inverseMap.entries())).to.deep.equal([['A', 'a']]);
        expect(Array.from(clone.edgeMap.entries())).to.deep.equal([[1, 2]]);
        expect(Array.from(clone.skipThisTime.values())).to.deep.equal([]); // supposed to be empty in the clone

        // more

        expect(Object.keys(clone)).to.deep.equal([
          'outer', 'inner', 'unitsOnly', 'outerEdges', 'innerEdges',
          'vertexMap', 'inverseMap', 'edgeMap', 'skipThisTime'
        ]);
        // these three are by-reference / readonly
        // so they should be not be copied
        expect(clone.outer).to.equal(metadata.outer);
        expect(clone.inner).to.equal(metadata.inner);
        expect(clone.unitsOnly).to.equal(metadata.unitsOnly);
        // these six are by-value / editable
        // so they should be separate objects (deep copies)
        expect(clone.outerEdges).to.not.equal(metadata.outerEdges);
        expect(clone.innerEdges).to.not.equal(metadata.innerEdges);
        expect(clone.vertexMap).to.not.equal(metadata.vertexMap);
        expect(clone.inverseMap).to.not.equal(metadata.inverseMap);
        expect(clone.edgeMap).to.not.equal(metadata.edgeMap);
        expect(clone.skipThisTime).to.not.equal(metadata.skipThisTime);
      });

      describe('nextInnerEdge', function() {
        beforeEach(function() {
          // they all need options
          metadata.innerEdges.forEach(function(e) { e.options = { pref: 0 }; });
        });

        it('no priority', function() {
          // all things being equal, it will pick the first one
          expect(metadata.nextInnerEdge()).to.equal(metadata.innerEdges[0]);
        });

        it('skipThisTime', function() {
          // if we are skipping one, then it shouldn't be considered
          metadata.skipThisTime.add(metadata.innerEdges[0]);
          expect(metadata.nextInnerEdge()).to.equal(metadata.innerEdges[1]);
        });

        it('best pref', function() {
          // if we find a better pref option, that should be chosen
          metadata.innerEdges[2].options.pref = 1;
          expect(metadata.nextInnerEdge()).to.equal(metadata.innerEdges[2]);
        });
      }); // end nextInnerEdge

      describe('nextOuterEdges', function() {
        it('all match', function() {
          const edge = metadata.innerEdges[0];
          subgraph.match.units.filterOuter.returnsArg(2); // return all outer edges
          return metadata.nextOuterEdges(edge).then(function(matches) {
            expect(matches).to.deep.equal([
              { src: 'A', link: { name: 'l1' }, dst: 'B' },
              { src: 'B', link: { name: 'l1' }, dst: 'C' },
              { src: 'A', link: { name: 'l1' }, dst: 'C' }
            ]);

            const outerEdges = metadata.outer.allEdges();
            expect(subgraph.match.units.filterOuter).to.have.callCount(3);
            expect(subgraph.match.units.filterOuter).to.have.been.calledWithExactly(metadata, edge, outerEdges[0]);
            expect(subgraph.match.units.filterOuter).to.have.been.calledWithExactly(metadata, edge, outerEdges[1]);
            expect(subgraph.match.units.filterOuter).to.have.been.calledWithExactly(metadata, edge, outerEdges[2]);
          });
        });

        it('one match', function() {
          const edge = metadata.innerEdges[0];
          subgraph.match.units.filterOuter.returns(undefined);
          subgraph.match.units.filterOuter.onCall(1).returnsArg(2); // return all outer edges
          return metadata.nextOuterEdges(edge).then(function(matches) {
            expect(matches).to.deep.equal([
              { src: 'B', link: { name: 'l1' }, dst: 'C' },
            ]);
            expect(subgraph.match.units.filterOuter).to.have.callCount(3);
          });
        });

        it('no match', function() {
          const edge = metadata.innerEdges[0];
          subgraph.match.units.filterOuter.returns(undefined);
          return metadata.nextOuterEdges(edge).then(function(matches) {
            expect(matches).to.deep.equal([]);
            expect(subgraph.match.units.filterOuter).to.have.callCount(3);
          });
        });

        it('no edges', function() {
          const edge = _.cloneDeep(metadata.innerEdges[0]);
          edge.link.name = 'no_edges';
          subgraph.match.units.filterOuter.returnsArg(2); // return all outer edges
          return metadata.nextOuterEdges(edge).then(function(matches) {
            expect(matches).to.deep.equal([]);
            expect(subgraph.match.units.filterOuter).to.have.callCount(0);
          });
        });
      }); // end nextOuterEdge

      it('removeInnerEdge', function() {
        const edge = metadata.innerEdges[1];
        metadata.removeInnerEdge(edge);
        expect(metadata.innerEdges).to.deep.equal([
          { src: 'a', link: { name: 'l1' }, dst: 'b' },
          { src: 'a', link: { name: 'l1' }, dst: 'c' }
        ]);
      });

      it('removeOuterEdge', function() {
        const edge = metadata.outerEdges.get('l1')[1];
        metadata.removeOuterEdge(edge);
        expect(metadata.outerEdges.get('l1')).to.deep.equal([
          { src: 'A', link: { name: 'l1' }, dst: 'B' },
          { src: 'A', link: { name: 'l1' }, dst: 'C' }
        ]);
      });

      it('updateVertexMap', function() {
        expect(Array.from(metadata.vertexMap.entries())).to.deep.equal([['a', 'A']]);
        expect(Array.from(metadata.inverseMap.entries())).to.deep.equal([['A', 'a']]);
        expect(Array.from(metadata.edgeMap.entries())).to.deep.equal([[1, 2]]);

        const innerEdge = { id: 100, src: 'y', dst: 'z'};
        const outerEdge = { id: 200, src: 'Y', dst: 'Z'};
        metadata.updateVertexMap(innerEdge, outerEdge);

        expect(Array.from(metadata.vertexMap.entries())).to.deep.equal([['a', 'A'], ['y', 'Y'], ['z', 'Z']]);
        expect(Array.from(metadata.inverseMap.entries())).to.deep.equal([['A', 'a'], ['Y', 'y'], ['Z', 'z']]);
        expect(Array.from(metadata.edgeMap.entries())).to.deep.equal([[1, 2], [100, 200]]);
      });
    }); // end SubgraphMatchMetadata

    describe('initializeVertexMap', function() {
      const outer = {};
      const inner = {};
      const unitsOnly = false;

      const vi_key = 'some inner id';
      const vo_key = 'some outer id';
      const vi_idea = { id: 'some idea' };
      beforeEach(function() {
        inner.allIdeas = ()=>(new Map());
        outer.allIdeas = ()=>(new Map());
      });

      it('no inner ideas', function() {
        return units.initializeVertexMap(outer, inner, unitsOnly).then(function(result) {
          expect(result).to.not.equal(undefined);
          expect(_.isMap(result)).to.equal(true);
          expect(result.size).to.equal(0);
          expect(subgraph.match.units.checkVertexData).to.have.callCount(0);
        });
      });

      it('no outer ideas', function() {
        inner.allIdeas = ()=>(new Map([[vi_key, vi_idea]]));
        subgraph.match.units.getOuterVertexIdFn.returns(()=>(undefined));
        return units.initializeVertexMap(outer, inner, unitsOnly).then(function(result) {
          expect(result).to.equal(undefined);
          expect(subgraph.match.units.checkVertexData).to.have.callCount(0);
        });
      });

      it('possible', function() {
        inner.allIdeas = ()=>(new Map([[vi_key, vi_idea]]));
        subgraph.match.units.getOuterVertexIdFn.returns(()=>(vo_key));
        subgraph.match.units.checkVertexData.returns(Promise.resolve(true));
        return units.initializeVertexMap(outer, inner, unitsOnly).then(function(result) {
          expect(result).to.not.equal(undefined);
          expect(_.isMap(result)).to.equal(true);
          expect(result.size).to.equal(1);
          expect(result.get(vi_key)).to.equal(vo_key);
          expect(subgraph.match.units.checkVertexData).to.have.callCount(1);
        });
      });

      it('not possible', function() {
        inner.allIdeas = ()=>(new Map([[vi_key, vi_idea]]));
        subgraph.match.units.getOuterVertexIdFn.returns(()=>(vo_key));
        subgraph.match.units.checkVertexData.returns(Promise.resolve(false));
        return units.initializeVertexMap(outer, inner, unitsOnly).then(function(result) {
          expect(result).to.equal(undefined);
          expect(subgraph.match.units.checkVertexData).to.have.callCount(1);
        });
      });
    }); // end initializeVertexMap

    describe('getOuterVertexIdFn', function() {
      function addData(map, i) { map.set(i, { id: (i+256).toString(16) }); }

      it('picks the right function', function() {
        const outerIdeas = new Map();

        // let's start with just a few keys
        while(outerIdeas.size < 5)
          addData(outerIdeas, outerIdeas.size);
        expect(units.getOuterVertexIdFn(outerIdeas, 3).name).to.equal('search');
        expect(units.getOuterVertexIdFn(outerIdeas, 4).name).to.equal('search');
        expect(units.getOuterVertexIdFn(outerIdeas, 5).name).to.equal('index');
        expect(units.getOuterVertexIdFn(outerIdeas, 6).name).to.equal('index');

        // let's get more realistic
        while(outerIdeas.size < 100)
          addData(outerIdeas, outerIdeas.size);
        expect(units.getOuterVertexIdFn(outerIdeas, 6).name).to.equal('search');
        expect(units.getOuterVertexIdFn(outerIdeas, 7).name).to.equal('search');
        expect(units.getOuterVertexIdFn(outerIdeas, 8).name).to.equal('index');
        expect(units.getOuterVertexIdFn(outerIdeas, 9).name).to.equal('index');

        // this is probably the right order of magnitude
        while(outerIdeas.size < 800)
          addData(outerIdeas, outerIdeas.size);
        expect(units.getOuterVertexIdFn(outerIdeas, 8).name).to.equal('search');
        expect(units.getOuterVertexIdFn(outerIdeas, 9).name).to.equal('search');
        expect(units.getOuterVertexIdFn(outerIdeas, 10).name).to.equal('index');
        expect(units.getOuterVertexIdFn(outerIdeas, 11).name).to.equal('index');
      });

      it('test index', function() {
        const outerIdeas = new Map();
        while(outerIdeas.size < 5)
          addData(outerIdeas, outerIdeas.size);
        const fn = units.getOuterVertexIdFn(outerIdeas, 6);
        expect(fn.name).to.equal('index');

        expect(fn('100')).to.equal(0);
        expect(fn('101')).to.equal(1);
        expect(fn('102')).to.equal(2);
        expect(fn('103')).to.equal(3);
        expect(fn('104')).to.equal(4);
      });

      it('test search', function() {
        const outerIdeas = new Map();
        while(outerIdeas.size < 5)
          addData(outerIdeas, outerIdeas.size);
        const fn = units.getOuterVertexIdFn(outerIdeas, 3);
        expect(fn.name).to.equal('search');

        expect(fn('100')).to.equal(0);
        expect(fn('101')).to.equal(1);
        expect(fn('102')).to.equal(2);
        expect(fn('103')).to.equal(3);
        expect(fn('104')).to.equal(4);
      });
    }); // end getOuterVertexIdFn

    describe('filterOuter', function() {
      const meta = {};
      const innerEdge = { id: 0 };
      const outerEdge = { id: 1 };

      it('possible', function() {
        subgraph.match.units.checkVertexData.returns(Promise.resolve(true));
        return units.filterOuter(meta, innerEdge, outerEdge).then(function(result) {
          expect(result).to.equal(outerEdge);
          expect(subgraph.match.units.checkVertexData).to.have.callCount(2);
        });
      });

      it('not possible', function() {
        subgraph.match.units.checkVertexData.returns(Promise.resolve(false));
        return units.filterOuter(meta, innerEdge, outerEdge).then(function(result) {
          expect(result).to.equal(undefined);
          expect(subgraph.match.units.checkVertexData).to.have.callCount(2);
        });
      });
    }); // end filterOuter

    // this is mostly integration stuff
    describe('checkVertexData', function() {
      const vi_key = 'some inner key';
      const vo_key = 'some outer key';
      const other_key = 'another vertex id';
      const meta = {};
      beforeEach(function() {
        subgraph.match.units.checkTransitionableVertexData.returns(Promise.resolve(true));
        subgraph.match.units.checkFixedVertexData.returns(Promise.resolve(true));

        meta.vertexMap = new Map();
        meta.inverseMap = new Map();
      });

      it('mapped', function() {
        meta.vertexMap.set(vi_key, vo_key);
        meta.inverseMap.set(vo_key, vi_key);
        return units.checkVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(subgraph.match.units.checkTransitionableVertexData).to.have.callCount(1);
          expect(subgraph.match.units.checkFixedVertexData).to.have.callCount(1);
        });
      });

      it('unmapped', function() {
        return units.checkVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(subgraph.match.units.checkTransitionableVertexData).to.have.callCount(1);
          expect(subgraph.match.units.checkFixedVertexData).to.have.callCount(1);
        });
      });

      it('inner somewhere else', function() {
        meta.vertexMap.set(vi_key, other_key);
        meta.inverseMap.set(other_key, vi_key);
        return units.checkVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(false);
          expect(subgraph.match.units.checkTransitionableVertexData).to.have.callCount(0);
          expect(subgraph.match.units.checkFixedVertexData).to.have.callCount(0);
        });
      });

      it('outer somewhere else', function() {
        meta.vertexMap.set(other_key, vo_key);
        meta.inverseMap.set(vo_key, other_key);
        return units.checkVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(false);
          expect(subgraph.match.units.checkTransitionableVertexData).to.have.callCount(0);
          expect(subgraph.match.units.checkFixedVertexData).to.have.callCount(0);
        });
      });

      it('possible', function() {
        return units.checkVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(subgraph.match.units.checkTransitionableVertexData).to.have.callCount(1);
          expect(subgraph.match.units.checkFixedVertexData).to.have.callCount(1);
        });
      });

      it('not possible', function() {
        subgraph.match.units.checkTransitionableVertexData.returns(Promise.resolve(false));
        subgraph.match.units.checkFixedVertexData.returns(Promise.resolve(false));
        return units.checkVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(false);
          expect(subgraph.match.units.checkTransitionableVertexData).to.have.callCount(1);
          expect(subgraph.match.units.checkFixedVertexData).to.have.callCount(1);
        });
      });
    }); // end checkVertexData

    describe('checkTransitionableVertexData', function() {
      const vi_key = 'some inner key';
      const vo_key = 'some outer key';
      const innerMatch = { data: 'some inner match data', options: {} };
      const outerMatch = { data: 'some outer match data', options: {} };
      const meta = { inner: { getMatch: ()=>(innerMatch) }, outer: { getMatch: ()=>(outerMatch) } };
      beforeEach(function() {
        innerMatch.options.transitionable = true;
        outerMatch.options.transitionable = true;
        meta.unitsOnly = false;

        subgraph.match.boundaries.getData.returns(Promise.resolve({unit: 'some unit', value: 'some inner data'}));
        meta.outer.getData = sinon.stub().returns(Promise.resolve({unit: 'some unit', value: 'some outer data'}));

        subgraph.match.boundaries.dataEquality = ()=>('dataEquality check');
      });

      // only valid if both vertices are transitionable
      it('transitionable checks', bluebird.coroutine(function*() {
        // false, true
        innerMatch.options.transitionable = false;
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal(true);

        // false, false
        outerMatch.options.transitionable = false;
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal(true);

        // true, false
        innerMatch.options.transitionable = true;
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal(false);

        // never got that far
        expect(meta.outer.getData).to.have.callCount(0);
        expect(subgraph.match.boundaries.getData).to.have.callCount(0);
      }));

      // XXX controversial check, see src
      it('no inner data', function() {
        subgraph.match.boundaries.getData.returns(Promise.resolve(null));
        return units.checkTransitionableVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
        });
      });

      // XXX controversial check, see src
      it('no outer data', function() {
        meta.outer.getData.returns(Promise.resolve(null));
        return units.checkTransitionableVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
        });
      });

      // XXX controversial check, see src
      it('must have units or nah', bluebird.coroutine(function*() {
        // both have unit
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal('dataEquality check');

        // one has unit
        subgraph.match.boundaries.getData.returns(Promise.resolve('some inner data'));
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal(false);

        // neither have unit
        meta.outer.getData.returns(Promise.resolve('some outer data'));
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal('dataEquality check');

        // other has unit
        subgraph.match.boundaries.getData.returns(Promise.resolve({unit: 'some unit', value: 'some inner data'}));
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal(false);
      }));

      it('units only without units', function() {
        meta.unitsOnly = true;
        subgraph.match.boundaries.getData.returns(Promise.resolve('some inner data'));
        meta.outer.getData.returns(Promise.resolve('some outer data'));
        return units.checkTransitionableVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(false);
        });
      });

      it('units only; match', function() {
        meta.unitsOnly = true;
        return units.checkTransitionableVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
        });
      });

      it('units only; mismatch', function() {
        meta.unitsOnly = true;
        subgraph.match.boundaries.getData.returns(Promise.resolve({unit: 'some other unit', value: 'some inner data'}));
        return units.checkTransitionableVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(false);
        });
      });

      // this is a boundary condition
      it('NOT units only', function() {
        return units.checkTransitionableVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal('dataEquality check');
        });
      });
    }); // end checkTransitionableVertexData

    describe('checkFixedVertexData', function() {
      const vi_key = 'some inner key';
      const vo_key = 'some outer key';
      const innerMatch = { data: 'some inner match data', options: {} };
      const meta = { inner: { getMatch: ()=>(innerMatch) }, outer: {} };
      beforeEach(function() {
        meta.inner.hasIdea = ()=>(false);
        meta.outer.getIdea = ()=>('some outer idea');
        meta.outer.getData = ()=>(Promise.resolve('some outer data'));
        meta.unitsOnly = false;

        innerMatch.matcher = sinon.stub().returns(true);
        innerMatch.options.transitionable = false;
        innerMatch.options.pointer = false;

        subgraph.match.boundaries.getData.returns(Promise.resolve('some inner data'));
      });

      // when the subgraph has already mapped the idea
      it('wrong phase', function() {
        meta.inner.hasIdea = sinon.stub().returns(true);
        return units.checkFixedVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(innerMatch.matcher).to.have.callCount(0);
        });
      });

      // we unconditionally call this on vertices
      // this is one case that isn't handled by this function
      it('not handled here: units', function() {
        meta.unitsOnly = true;
        return units.checkFixedVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(innerMatch.matcher).to.have.callCount(0);
        });
      });

      // we unconditionally call this on vertices
      // this is one case that isn't handled by this function
      it('not handled here: transitionable', function() {
        innerMatch.options.transitionable = true;
        return units.checkFixedVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(innerMatch.matcher).to.have.callCount(0);
        });
      });

      // check innerData
      it('is a pointer', function() {
        innerMatch.options.pointer = true;
        return units.checkFixedVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(innerMatch.matcher).to.have.callCount(1);
          expect(innerMatch.matcher).to.have.been.calledWithExactly('some outer data', 'some inner data');
        });
      });

      // check innerData
      it('not a pointer', function() {
        innerMatch.options.pointer = false;
        return units.checkFixedVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal(true);
          expect(innerMatch.matcher).to.have.callCount(1);
          expect(innerMatch.matcher).to.have.been.calledWithExactly('some outer data', 'some inner match data');
        });
      });

      // check outerData
      it('id matcher', function() {
        sinon.stub(subgraph.matcher, 'id');
        innerMatch.matcher = subgraph.matcher.id;
        innerMatch.matcher.returns('stubbed result');
        return units.checkFixedVertexData(meta, vi_key, vo_key).then(function(result) {
          expect(result).to.equal('stubbed result');
          expect(innerMatch.matcher).to.have.callCount(1);
          expect(innerMatch.matcher).to.have.been.calledWithExactly('some outer idea', 'some inner match data');
          subgraph.matcher.id.restore();
        }, function() {
          subgraph.matcher.id.restore();
        });
      });
    }); // end checkFixedVertexData

    //

    it('dataEquality', function() {
      // XXX this is just for coverage but it will most certainly change when the function is updated
      expect(boundaries.dataEquality({ a: 1, b: 2 }, { a: 1, b: 2 })).to.equal(true);
      expect(boundaries.dataEquality({ a: 1, b: 2 }, { a: 1, b: 3 })).to.equal(false);
    }); // end dataEquality

    describe('getData', function() {
      // XXX do I setup a subgraph or mock a subgraph
      // - if I mock out subgraph, then I'm basically just writing a test to get 100% coverage
      // - even if we primarily test with a mock, should I still run one or two without mocks?
      const vi_key = 'some inner id';
      const vo_key = 'some outer id';
      const target_key = 'some target id';
      const metadata = { inner: {}, outer: {} };
      const innerMatch = { data: target_key, options: {} };
      beforeEach(function() {
        // defaults are set for 'no data to be found'
        innerMatch.options.pointer = true;
        metadata.inner.hasIdea = sinon.stub().returns(false);
        metadata.inner.getData = sinon.stub().returns(Promise.resolve(null));
        metadata.outer.getData = sinon.stub().returns(Promise.resolve(null));
        metadata.vertexMap = new Map();
      });

      it('not pointer', bluebird.coroutine(function*() {
        innerMatch.options.pointer = false;
        metadata.inner.getData = sinon.stub().returns(Promise.resolve('some inner data'));
        expect(metadata.inner.getData).to.have.callCount(0);

        expect(yield boundaries.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(vi_key);
      }));

      it('hasIdea', bluebird.coroutine(function*() {
        metadata.inner.hasIdea = sinon.stub().returns(true);
        metadata.inner.getData = sinon.stub().returns(Promise.resolve('some inner data'));
        expect(metadata.inner.getData).to.have.callCount(0);

        expect(yield boundaries.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(vi_key);
      }));

      it('target inner has data', bluebird.coroutine(function*() {
        metadata.inner.getData = sinon.stub().returns(Promise.resolve('some inner data'));
        expect(metadata.inner.getData).to.have.callCount(0);

        expect(yield boundaries.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);
      }));

      it('target outer has data', bluebird.coroutine(function*() {
        metadata.inner.getData = sinon.stub().returns(Promise.resolve(null));
        metadata.outer.getData = sinon.stub().returns(Promise.resolve('some outer data'));
        metadata.vertexMap.set(target_key, vo_key);
        expect(metadata.inner.getData).to.have.callCount(0);
        expect(metadata.outer.getData).to.have.callCount(0);

        expect(yield boundaries.getData(metadata, vi_key, innerMatch)).to.equal('some outer data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.outer.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);
        expect(metadata.outer.getData).to.have.been.calledWithExactly(vo_key);
      }));

      it('no data to be found', bluebird.coroutine(function*() {
        expect(metadata.inner.getData).to.have.callCount(0);
        expect(metadata.outer.getData).to.have.callCount(0);

        expect(yield boundaries.getData(metadata, vi_key, innerMatch)).to.equal(null);

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.outer.getData).to.have.callCount(0);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);
      }));
    }); // end getData
  }); // end match
}); // end subgraph