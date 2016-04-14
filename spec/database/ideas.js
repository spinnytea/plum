'use strict';
const expect = require('chai').use(require('chai-as-promised')).expect;
const ideas = require('../../src/database/ideas');

describe('ideas', function() {
  it('init', function() {
    expect(Object.keys(ideas)).to.deep.equal(['create', 'load', 'proxy', 'save', 'close', 'context']);
  });

  it('create (empty)', function() {
    return ideas.create().then(function(proxy) {
      expect(proxy).to.have.property('id');
      expect(ideas.units.memory.has(proxy.id)).to.equal(true);
      expect(ideas.boundaries.database.data).to.not.have.property(proxy.id);
    });
  });

  it('create (data)', function() {
    return ideas.create({key:'some data'}).then(function(proxy) {
      expect(proxy).to.have.property('id');
      expect(ideas.units.memory.has(proxy.id)).to.equal(true);
      expect(ideas.boundaries.database.data).to.have.property(proxy.id);
    });
  });

  it('load (empty)', function() {
    const id = '_test_' + Math.random();
    expect(ideas.units.memory.has(id)).to.equal(false);
    return ideas.load(id).then(function(proxy) {
      expect(proxy.id).to.equal(id);
      expect(ideas.units.memory.has(proxy.id)).to.equal(true);
    });
  });

  it('proxy', function() {
    return ideas.proxy('_test').then(function(proxy) {
      expect(proxy.id).to.equal('_test');
      expect(proxy.constructor.name).to.equal('ProxyIdea');
    });
  });

  it('save (not loaded)', function() {
    const id = '_test_' + Math.random();
    expect(ideas.units.memory.has(id)).to.equal(false);
    return ideas.save(id).then(function(proxy) {
      expect(proxy.id).to.equal(id);
      expect(ideas.units.memory.has(proxy.id)).to.equal(false);
      expect(ideas.boundaries.database.data).to.not.property(proxy.id);
    });
  });

  it('save (empty)', function() {
    return ideas.create().then(ideas.save).then(function(proxy) {
      expect(proxy).to.have.property('id');
      expect(ideas.units.memory.has(proxy.id)).to.equal(true);
      expect(ideas.boundaries.database.data).to.not.have.property(proxy.id);
    });
  });

  it('save (data)', function() {
    return ideas.create({key:'some data'}).then(ideas.save).then(function(proxy) {
      expect(proxy).to.have.property('id');
      expect(ideas.units.memory.has(proxy.id)).to.equal(true);
      expect(ideas.boundaries.database.data).to.have.property(proxy.id);
    });
  });

  it('close', function() {
    return ideas.create().then(ideas.close).then(function(proxy) {
      expect(proxy).to.have.property('id');
      expect(ideas.units.memory.has(proxy.id)).to.equal(false);
    });
  });

  it('context', function() {
    const name = '_test_' + Math.random();
    return ideas.context(name).then(function(proxy) {
      expect(proxy).to.have.property('id');
      expect(ideas.boundaries.database.data).to.have.property(proxy.id);
      return ideas.context(name).then(function(proxy2) {
        expect(proxy2).to.deep.equal(proxy);
      });
    });
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