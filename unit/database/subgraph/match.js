'use strict';
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const sinon = require('sinon');
const subgraph = require('../../../src/database/subgraph');

describe('subgraph', function() {
  describe('match', function() {
    it.skip('match'); // end match

    it.skip('recursiveMatch'); // end recursiveMatch

    it.skip('SubgraphMatchMetadata'); // end SubgraphMatchMetadata

    it.skip('initializeVertexMap'); // end initializeVertexMap

    describe('getOuterVertexIdFn', function() {
      const getOuterVertexIdFn = subgraph.match.units.getOuterVertexIdFn;
      function addData(map, i) { map.set(i, { id: (i+256).toString(16) }); }

      it('picks the right function', function() {
        const outerIdeas = new Map();

        // let's start with just a few keys
        while(outerIdeas.size < 5)
          addData(outerIdeas, outerIdeas.size);
        expect(getOuterVertexIdFn(outerIdeas, 3).name).to.equal('search');
        expect(getOuterVertexIdFn(outerIdeas, 4).name).to.equal('search');
        expect(getOuterVertexIdFn(outerIdeas, 5).name).to.equal('index');
        expect(getOuterVertexIdFn(outerIdeas, 6).name).to.equal('index');

        // let's get more realistic
        while(outerIdeas.size < 100)
          addData(outerIdeas, outerIdeas.size);
        expect(getOuterVertexIdFn(outerIdeas, 6).name).to.equal('search');
        expect(getOuterVertexIdFn(outerIdeas, 7).name).to.equal('search');
        expect(getOuterVertexIdFn(outerIdeas, 8).name).to.equal('index');
        expect(getOuterVertexIdFn(outerIdeas, 9).name).to.equal('index');

        // this is probably the right order of magnitude
        while(outerIdeas.size < 800)
          addData(outerIdeas, outerIdeas.size);
        expect(getOuterVertexIdFn(outerIdeas, 8).name).to.equal('search');
        expect(getOuterVertexIdFn(outerIdeas, 9).name).to.equal('search');
        expect(getOuterVertexIdFn(outerIdeas, 10).name).to.equal('index');
        expect(getOuterVertexIdFn(outerIdeas, 11).name).to.equal('index');
      });

      it('test index', function() {
        const outerIdeas = new Map();
        while(outerIdeas.size < 5)
          addData(outerIdeas, outerIdeas.size);
        const fn = getOuterVertexIdFn(outerIdeas, 6);
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
        const fn = getOuterVertexIdFn(outerIdeas, 3);
        expect(fn.name).to.equal('search');

        expect(fn('100')).to.equal(0);
        expect(fn('101')).to.equal(1);
        expect(fn('102')).to.equal(2);
        expect(fn('103')).to.equal(3);
        expect(fn('104')).to.equal(4);
      });
    }); // end getOuterVertexIdFn

    it.skip('filterOuter'); // end filterOuter

    describe('getData', function() {
      // XXX do I setup a subgraph or mock a subgraph
      // - if I mock out subgraph, then I'm basically just writing a test to get 100% coverage
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

        expect(yield subgraph.match.units.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(vi_key);

      }));

      it('hasIdea', bluebird.coroutine(function*() {
        metadata.inner.hasIdea = sinon.stub().returns(true);
        metadata.inner.getData = sinon.stub().returns(Promise.resolve('some inner data'));
        expect(metadata.inner.getData).to.have.callCount(0);

        expect(yield subgraph.match.units.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(vi_key);

      }));

      it('target inner has data', bluebird.coroutine(function*() {
        metadata.inner.getData = sinon.stub().returns(Promise.resolve('some inner data'));
        expect(metadata.inner.getData).to.have.callCount(0);

        expect(yield subgraph.match.units.getData(metadata, vi_key, innerMatch)).to.equal('some inner data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);

      }));

      it('target outer has data', bluebird.coroutine(function*() {
        metadata.inner.getData = sinon.stub().returns(Promise.resolve(null));
        metadata.outer.getData = sinon.stub().returns(Promise.resolve('some outer data'));
        metadata.vertexMap.set(target_key, vo_key);
        expect(metadata.inner.getData).to.have.callCount(0);
        expect(metadata.outer.getData).to.have.callCount(0);

        expect(yield subgraph.match.units.getData(metadata, vi_key, innerMatch)).to.equal('some outer data');

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.outer.getData).to.have.callCount(1);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);
        expect(metadata.outer.getData).to.have.been.calledWithExactly(vo_key);
      }));

      it('no data to be found', bluebird.coroutine(function*() {
        expect(metadata.inner.getData).to.have.callCount(0);
        expect(metadata.outer.getData).to.have.callCount(0);

        expect(yield subgraph.match.units.getData(metadata, vi_key, innerMatch)).to.equal(null);

        expect(metadata.inner.getData).to.have.callCount(1);
        expect(metadata.outer.getData).to.have.callCount(0);
        expect(metadata.inner.getData).to.have.been.calledWithExactly(target_key);
      }));
    }); // end getData

    it.skip('checkVertexData'); // end checkVertexData

    describe('vertexTransitionableAcceptable', function() {
      const vertexTransitionableAcceptable = subgraph.match.units.vertexTransitionableAcceptable;
      let vo_data;
      let vi_data;
      let unitsOnly;

      it('up front checks', function() {
        // if transitionable isn't true for both then it doesn't matter what vo_data, vi_data, unitsOnly are
        expect(vertexTransitionableAcceptable(true, vo_data, false, vi_data, unitsOnly)).to.equal(true);
        expect(vertexTransitionableAcceptable(false, vo_data, true, vi_data, unitsOnly)).to.equal(false);
        expect(vertexTransitionableAcceptable(false, vo_data, false, vi_data, unitsOnly)).to.equal(true);
      });

      it('no outer data', function() {
        vo_data = null;
        vi_data = { value: 1, unit: 'a' };
        unitsOnly = true;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(true);
      });

      it('no inner data', function() {
        vo_data = { value: 1, unit: 'a' };
        vi_data = null;
        unitsOnly = true;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(true);
      });

      it('same data, units only', function() {
        vo_data = { value: 1, unit: 'a' };
        vi_data = { value: 1, unit: 'a' };
        unitsOnly = true;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(true);
      });

      it('different data, units only', function() {
        vo_data = { value: 1, unit: 'a' };
        vi_data = { value: 2, unit: 'a' };
        unitsOnly = true;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(true);
      });

      it('different units, units only', function() {
        vo_data = { value: 1, unit: 'a' };
        vi_data = { value: 1, unit: 'b' };
        unitsOnly = true;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(false);
      });

      it('mismatched units, units only', function() {
        vo_data = { value: 1, unit: 'a' };
        vi_data = { value: 1 };
        unitsOnly = true;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(false);
      });

      it.skip('no units, units only');

      it('same data, not units', function() {
        vo_data = { value: 1, unit: 'a' };
        vi_data = { value: 1, unit: 'a' };
        unitsOnly = false;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(true);
      });

      it('different data, not units', function() {
        vo_data = { value: 1, unit: 'a' };
        vi_data = { value: 2, unit: 'a' };
        unitsOnly = false;
        expect(vertexTransitionableAcceptable(true, vo_data, true, vi_data, unitsOnly)).to.equal(false);
      });
    }); // end vertexTransitionableAcceptable

    describe('runMatchersOnVertices', function() {
      const innerData = 'some inner data';
      const innerMatch = { data: 'inner match data', options: {} };
      const outer = {};
      const vo_key = {};
      const unitsOnly = false;
      beforeEach(function() {
        void(innerData, innerMatch, outer, vo_key, unitsOnly);

        outer.getIdea = sinon.stub().returns('some id');
        outer.getData = sinon.stub().returns(Promise.resolve('some outer data'));
        innerMatch.options.transitionable = false;
        innerMatch.matcher = sinon.stub().returns('matcher fn');
      });

      it('not handled here: units', function() {
        return subgraph.match.units.runMatchersOnVertices(innerData, innerMatch, outer, vo_key, true).then(function(result) {
          expect(result).to.equal(true);
          expect(innerMatch.matcher).to.have.callCount(0);
        });
      });

      it('not handled here: transitionable', function() {
        innerMatch.options.transitionable = true;
        return subgraph.match.units.runMatchersOnVertices(innerData, innerMatch, outer, vo_key, unitsOnly).then(function(result) {
          expect(result).to.equal(true);
          expect(innerMatch.matcher).to.have.callCount(0);
        });
      });

      it('is a pointer', function() {
        innerMatch.options.pointer = true;
        return subgraph.match.units.runMatchersOnVertices(innerData, innerMatch, outer, vo_key, unitsOnly).then(function(result) {
          expect(result).to.equal('matcher fn');
          expect(innerMatch.matcher).to.have.callCount(1);
          // test for innerData
          expect(innerMatch.matcher).to.have.been.calledWithExactly('some outer data', 'some inner data');
        });
      });

      it('not a pointer', function() {
        innerMatch.options.pointer = false;
        return subgraph.match.units.runMatchersOnVertices(innerData, innerMatch, outer, vo_key, unitsOnly).then(function(result) {
          expect(result).to.equal('matcher fn');
          expect(innerMatch.matcher).to.have.callCount(1);
          // test for innerData
          expect(innerMatch.matcher).to.have.been.calledWithExactly('some outer data', 'inner match data');
        });
      });

      it('id matcher', function() {
        sinon.stub(subgraph.matcher, 'id');
        innerMatch.matcher = subgraph.matcher.id;
        innerMatch.matcher.returns('stubbed result');
        return subgraph.match.units.runMatchersOnVertices(innerData, innerMatch, outer, vo_key, unitsOnly).then(function(result) {
          expect(result).to.equal('stubbed result');
          expect(innerMatch.matcher).to.have.callCount(1);
          // test for outerData
          expect(innerMatch.matcher).to.have.been.calledWithExactly('some id', 'inner match data');
          subgraph.matcher.id.restore();
        });
      });
    }); // end runMatchersOnVertices
  }); // end match
}); // end subgraph