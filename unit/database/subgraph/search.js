'use strict';
const _ = require('lodash');
const sinon = require('sinon');
const ideas = require('../../../src/database/ideas');
// const links = require('../../../src/database/links');
const search = require('../../../src/database/subgraph/search');

describe('subgraph', function() {
  describe('search', function() {
    var units = {};
    var data = {
      person: {name:'person'},
      mark: {name:'mark'},
    };
    before(function() {
      _.assign(units, search.units);
      return ideas.createGraph(data, [
        ['mark', 'type_of', 'person'],
      ]);
    });
    after(function() {
      _.assign(search.units, units);
      _.values(data).forEach(ideas.delete);
    });
    
    // spy on the functions
    beforeEach(function() {
      _.keys(search.units).forEach(function(name) {
        search.units[name] = sinon.spy();
      });
    });

    it.skip('edge order');

    describe('findEdgeToExpand', function() {
      it.skip('test it', function() {
        console.log(data);
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