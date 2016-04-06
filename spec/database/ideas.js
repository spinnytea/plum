'use strict';
const expect = require('chai').use(require('chai-as-promised')).expect;
const ideas = require('../../src/database/ideas');

describe('ideas', function() {
  it('init', function() {
    expect(Object.keys(ideas)).to.deep.equal(['create', 'save']);
  });

  it('create (empty)', function() {
    return expect(ideas.create()).to.eventually.have.property('id');
  });

  it('create (data)', function() {
    return expect(ideas.create({key:'some data'})).to.eventually.have.property('id');
  });

  it('save (empty)', function() {
    let id = '_test_' + Math.random();
    return expect(ideas.save(id)).to.eventually.deep.equal({id:id});
  });

  it('save (data)', function() {
    return expect(ideas.save('_test').then(ideas.save)).to.eventually.deep.equal({id:'_test'});
  });

  //

  describe('boundaries', function() {
    it('init', function() {
      expect(Object.keys(ideas.boundaries)).to.deep.equal(['database', 'memoryLoad', 'memorySave']);
    });

    it('database', function() { /* there isn't anything to test */ });

    describe('memoryLoad', function() {
      const id = '_test';
      const invalid_id = '_test_another_id';
      before(function() {
        ideas.boundaries.database.data[id] = 'some data';
        ideas.boundaries.database.links[id] = 'some links';
      });
      after(function() {
        delete ideas.boundaries.database.data[id];
        delete ideas.boundaries.database.links[id];
      });

      it('data', function(done) {
        ideas.boundaries.memoryLoad(id, 'data').then(function(data) {
          expect(data).to.equal('some data');
        }).then(done, done);
      });

      it('links', function(done) {
        ideas.boundaries.memoryLoad(id, 'links').then(function(data) {
          expect(data).to.equal('some links');
        }).then(done, done);
      });

      it('no data', function(done) {
        ideas.boundaries.memoryLoad(invalid_id, 'data').then(function(data) {
          expect(data).to.equal(undefined);
        }).then(done, done);
      });
    }); // end memoryLoad

    describe('memorySave', function() {
      const id = '_test';

      it('data', function(done) {
        ideas.boundaries.memorySave(id, 'data', 'some data').then(function() {
          expect(ideas.boundaries.database.data[id]).to.equal('some data');
          return ideas.boundaries.memorySave(id, 'data', null);
        }).then(function() {
          expect(ideas.boundaries.database.data).to.not.have.property(id);
        }).then(done, done);
      });

      it('links', function(done) {
        ideas.boundaries.memorySave(id, 'links', 'some links').then(function() {
          expect(ideas.boundaries.database.links[id]).to.equal('some links');
          return ideas.boundaries.memorySave(id, 'links', null);
        }).then(function() {
          expect(ideas.boundaries.database.links).to.not.have.property(id);
        }).then(done, done);
      });
    }); // end memorySave
  }); // end boundaries
}); // end ideas