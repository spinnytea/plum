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

    it.skip('match'); // end match

    it.skip('recursiveMatch'); // end recursiveMatch

    it.skip('SubgraphMatchMetadata'); // end SubgraphMatchMetadata

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

        expect(yield units.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(vi_key);

      }));

      it('hasIdea', bluebird.coroutine(function*() {
        metadata.inner.hasIdea = sinon.stub().returns(true);
        metadata.inner.getData = sinon.stub().returns(Promise.resolve('some inner data'));
        expect(metadata.inner.getData).to.have.callCount(0);

        expect(yield units.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(vi_key);

      }));

      it('target inner has data', bluebird.coroutine(function*() {
        metadata.inner.getData = sinon.stub().returns(Promise.resolve('some inner data'));
        expect(metadata.inner.getData).to.have.callCount(0);

        expect(yield units.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);

      }));

      it('target outer has data', bluebird.coroutine(function*() {
        metadata.inner.getData = sinon.stub().returns(Promise.resolve(null));
        metadata.outer.getData = sinon.stub().returns(Promise.resolve('some outer data'));
        metadata.vertexMap.set(target_key, vo_key);
        expect(metadata.inner.getData).to.have.callCount(0);
        expect(metadata.outer.getData).to.have.callCount(0);

        expect(yield units.getData(metadata, vi_key, innerMatch)).to.equal('some outer data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.outer.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);
        expect(metadata.outer.getData).to.have.been.calledWithExactly(vo_key);
      }));

      it('no data to be found', bluebird.coroutine(function*() {
        expect(metadata.inner.getData).to.have.callCount(0);
        expect(metadata.outer.getData).to.have.callCount(0);

        expect(yield units.getData(metadata, vi_key, innerMatch)).to.equal(null);

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.outer.getData).to.have.callCount(0);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);
      }));
    }); // end getData

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

        subgraph.match.units.getData.returns(Promise.resolve({unit: 'some unit', value: 'some inner data'}));
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
        expect(subgraph.match.units.getData).to.have.callCount(0);
      }));

      // XXX controversial check, see src
      it('no inner data', function() {
        subgraph.match.units.getData.returns(Promise.resolve(null));
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
        subgraph.match.units.getData.returns(Promise.resolve('some inner data'));
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal(false);

        // neither have unit
        meta.outer.getData.returns(Promise.resolve('some outer data'));
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal('dataEquality check');

        // other has unit
        subgraph.match.units.getData.returns(Promise.resolve({unit: 'some unit', value: 'some inner data'}));
        expect(yield units.checkTransitionableVertexData(meta, vi_key, vo_key)).to.equal(false);
      }));

      it('units only without units', function() {
        meta.unitsOnly = true;
        subgraph.match.units.getData.returns(Promise.resolve('some inner data'));
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
        subgraph.match.units.getData.returns(Promise.resolve({unit: 'some other unit', value: 'some inner data'}));
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

        subgraph.match.units.getData.returns(Promise.resolve('some inner data'));
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
  }); // end match
}); // end subgraph