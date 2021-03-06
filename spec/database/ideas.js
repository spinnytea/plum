'use strict';
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-as-promised')).expect;
const ideas = require('../../src/database/ideas');
const links = require('../../src/database/links');

describe('ideas', function() {
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
    const proxy = ideas.proxy('_test');
    expect(proxy.id).to.equal('_test');
    expect(proxy.constructor.name).to.equal('ProxyIdea');
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

  it('delete', bluebird.coroutine(function*() {
      const one = yield ideas.create('one');
      const two = yield ideas.create('two');
      const link = links.get('thought_description');
      yield one.addLink(link, two);

      // setup
      expect(yield one.links(link)).to.deep.equal([two]);
      expect(yield two.links(link.opposite)).to.deep.equal([one]);
      expect(ideas.units.memory.has(one.id)).to.equal(true);
      expect(ideas.units.memory.has(two.id)).to.equal(true);
      expect(ideas.boundaries.database.data).to.have.property(one.id);
      expect(ideas.boundaries.database.data).to.have.property(two.id);
      expect(ideas.boundaries.database.links).to.have.property(one.id);
      expect(ideas.boundaries.database.links).to.have.property(two.id);

      yield ideas.delete(two);

      expect(yield one.links(link)).to.deep.equal([]);
      // expect(yield two.links(link.opposite)).to.deep.equal([]);
      expect(ideas.units.memory.has(one.id)).to.equal(true);
      expect(ideas.units.memory.has(two.id)).to.equal(false);
      expect(ideas.boundaries.database.data).to.have.property(one.id);
      expect(ideas.boundaries.database.data).to.not.have.property(two.id);
      expect(ideas.boundaries.database.links).to.have.property(one.id);
      expect(ideas.boundaries.database.links).to.not.have.property(two.id);

      yield ideas.delete(one);

      expect(ideas.units.memory.has(one.id)).to.equal(false);
      expect(ideas.boundaries.database.data).to.not.have.property(one.id);
      expect(ideas.boundaries.database.links).to.not.have.property(one.id);
  }));

  it('context', bluebird.coroutine(function*() {
    const name = '_test_' + Math.random();

    let proxy = yield ideas.context(name);
    expect(proxy).to.have.property('id');
    expect(ideas.boundaries.database.data).to.have.property(proxy.id);

    let proxy2 = yield ideas.context(name);
    expect(proxy2).to.deep.equal(proxy);
  }));

  it('context (invalid arg)', function() {
    return expect(ideas.context()).to.eventually.be.rejectedWith(TypeError);
  });

  it('createGraph', bluebird.coroutine(function*() {
    const verts = {
      person: {name:'person'},
      mark: {name:'mark'},
    };
    const edges = [
      ['mark', 'type_of', 'person'],
    ];

    yield ideas.createGraph(verts, edges);

    expect(verts.person).to.have.property('id');
    expect(verts.mark).to.have.property('id');
    expect(yield verts.person.data()).to.deep.equal({name:'person'});
    expect(yield verts.mark.data()).to.deep.equal({name:'mark'});

    expect(yield verts.mark.links(links.get('type_of'))).to.deep.equal([verts.person]);
  }));

  //

  describe('boundaries', function() {
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
          return ideas.boundaries.memorySave(id, 'data', undefined);
        }).then(function() {
          expect(ideas.boundaries.database.data).to.not.have.property(id);
        }).then(done, done);
      });

      it('links', function(done) {
        ideas.boundaries.memorySave(id, 'links', 'some links').then(function() {
          expect(ideas.boundaries.database.links[id]).to.equal('some links');
          return ideas.boundaries.memorySave(id, 'links', undefined);
        }).then(function() {
          expect(ideas.boundaries.database.links).to.not.have.property(id);
        }).then(done, done);
      });
    }); // end memorySave
  }); // end boundaries
}); // end ideas