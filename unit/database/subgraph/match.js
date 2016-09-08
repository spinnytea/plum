'use strict';
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const subgraph = require('../../../src/database/subgraph');

describe('subgraph', function() {
  describe('match', function() {
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
  }); // end match
}); // end subgraph