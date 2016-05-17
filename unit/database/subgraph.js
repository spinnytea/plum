'use strict';
const expect = require('chai').use(require('chai-as-promised')).expect;
const ideas = require('../../src/database/ideas');
const links = require('../../src/database/links');
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  describe('LazyCopyObject', function() {
    it('invalid constructor args', function() {
      expect(function() { new subgraph.units.LazyCopyObject(false); }).to.throw(TypeError); // jshint ignore:line
    });

    it('set', function() {
      const lco = new subgraph.units.LazyCopyObject();
      const key = 0;
      expect(lco.data.get(key)).to.equal(undefined);

      lco.set(key, 0);

      expect(lco.data.get(key)).to.equal(0);
      expect(lco.get(key)).to.equal(0);
    });

    describe('get', function() {
      describe('no parent', function() {
        const lco = new subgraph.units.LazyCopyObject();
        const key = 0;
        lco.data.set(key, 0);

        it('found', function() {
          expect(lco.get(key)).to.equal(0);
        });

        it('not found', function() {
          expect(lco.get(1)).to.equal(undefined);
        });
      }); // end no parent

      describe('has parent', function() {
        const lco = new subgraph.units.LazyCopyObject();
        const par = new subgraph.units.LazyCopyObject();
        lco.parent = par;
        lco.data.set('c', 0);
        par.data.set('p', 1);

        it('found local', function() {
          expect(lco.get('c')).to.equal(0);
        });

        it('found in parent', function() {
          expect(lco.get('p')).to.equal(1);
        });

        it('not found', function() {
          expect(lco.get('dne')).to.equal(undefined);
        });

        it('overwritten locally', function() {
          const over = new subgraph.units.LazyCopyObject();
          over.parent = lco;
          over.data.set('c', 2);
          over.data.set('p', 3);
          expect(over.get('c')).to.equal(2);
          expect(over.get('p')).to.equal(3);
        });
      }); // end has parent
    }); // end get

    it('flatten', function() {
      const lco = new subgraph.units.LazyCopyObject();

      lco.flatten();
      expect(lco.data.size).to.equal(0);
      expect(Array.from(lco.data.entries())).to.deep.equal([]);
      expect(lco.parent).to.equal(undefined);

      lco.parent = new subgraph.units.LazyCopyObject(new subgraph.units.LazyCopyObject());
      lco.flatten();
      expect(Array.from(lco.data.entries())).to.deep.equal([]);
      expect(lco.parent).to.equal(undefined);

      lco.parent = new subgraph.units.LazyCopyObject(new subgraph.units.LazyCopyObject());
      lco.set('a', 1);
      lco.parent.set('b', 2);
      lco.parent.parent.set('c', 3);
      lco.parent.parent.set('a', 4);
      lco.flatten();
      expect(Array.from(lco.data.entries())).to.deep.equal([['a', 1], ['b', 2], ['c', 3]]);
      expect(lco.parent).to.equal(undefined);
    });
  }); // end LazyCopyObject

  describe('Subgraph', function() {
    let sg;
    beforeEach(function() { sg = new subgraph.units.Subgraph(); });

    it('construct', function() {
      expect(sg).to.have.property('_match');
    });

    it('copy', function() {
      const orig = new subgraph.units.Subgraph();
      const copy = orig.copy();
      expect(copy).to.deep.equal(orig);
    });
    
    describe('addVertex', function() {
      it('invalid matcher', function() {
        expect(function() { sg.addVertex(null); }).to.throw('invalid matcher');
        expect(function() { sg.addVertex(function() {}); }).to.throw('invalid matcher');
        expect(function() { sg.addVertex(subgraph.matcher.filler, undefined, { pointer: true }); }).to.throw(RangeError);
      });

      it('no data in non-filler', function() {
        expect(function() { sg.addVertex(subgraph.matcher.id); }).to.throw('match data must be defined');
      });

      it('filler', function() {
        const v = sg.addVertex(subgraph.matcher.filler);

        expect(v).to.equal(0);
        expect(sg._vertexCount).to.equal(1);
        expect(sg.concrete).to.equal(false);
        expect(sg._match.data.get(0)).to.deep.equal({
          matcher: subgraph.matcher.filler,
          data: undefined,
          options: {
            transitionable: false,
            pointer: false
          }
        });
      });

      it('id', function() {
        const v1 = sg.addVertex(subgraph.matcher.id, { id: '_test' });
        const v2 = sg.addVertex(subgraph.matcher.id, '_test2');

        expect(v1).to.equal(0);
        expect(v2).to.equal(1);
        expect(sg._vertexCount).to.equal(2);
        expect(sg.concrete).to.equal(true);
        expect(sg._match.data.get(0)).to.deep.equal({
          matcher: subgraph.matcher.id,
          data: '_test',
          options: {
            transitionable: false,
            pointer: false
          }
        });
        expect(sg._match.data.get(1)).to.deep.equal({
          matcher: subgraph.matcher.id,
          data: '_test2',
          options: {
            transitionable: false,
            pointer: false
          }
        });
        expect(sg._idea).to.have.property(v1);
        expect(sg._idea).to.have.property(v2);
      });

      it('substring', function() {
        const v = sg.addVertex(subgraph.matcher.substring, { value: 'SoMe StRiNg', path: undefined });
        expect(v).to.equal(0);
        expect(sg._vertexCount).to.equal(1);
        expect(sg.concrete).to.equal(false);
        expect(sg._match.data.get(0)).to.deep.equal({
          matcher: subgraph.matcher.substring,
          data: { value: 'some string', path: undefined },
          options: {
            transitionable: false,
            pointer: false
          }
        });
      });
      
      it('options', function() {
        const o = {
          transitionable: true,
          pointer: false
        };
        const v = sg.addVertex(subgraph.matcher.filler, undefined, o);
        expect(sg._match.data.get(v).options).to.deep.equal(o);
      });
    }); // end addVertex

    describe('addEdge', function() {
      let v1, v2;
      const link = links.get('thought_description');
      beforeEach(function() {
        v1 = sg.addVertex(subgraph.matcher.filler);
        v2 = sg.addVertex(subgraph.matcher.filler);
      });

      it('invalid src', function() {
        expect(function() { sg.addEdge('banana', link, v2); }).to.throw(TypeError);
        expect(function() { sg.addEdge(-1, link, v2); }).to.throw(RangeError);
        expect(function() { sg.addEdge(2, link, v2); }).to.throw(RangeError);
      });

      it('invalid dst', function() {
        expect(function() { sg.addEdge(v1, link, 'banana'); }).to.throw(TypeError);
        expect(function() { sg.addEdge(v1, link, -1); }).to.throw(RangeError);
        expect(function() { sg.addEdge(v1, link, 2); }).to.throw(RangeError);
      });

      it('invalid link', function() {
        expect(function() { sg.addEdge(v1, null, v2); }).to.throw(TypeError);
        expect(function() { sg.addEdge(v1, {}, v2); }).to.throw(TypeError);
        expect(function() { sg.addEdge(v1, { name: '__foobar_!@#$%^&*()__' }, v2); }).to.throw(TypeError);
      });

      it('basic', function() {
        const e = sg.addEdge(v1, link, v2);

        expect(e).to.equal(0);
        expect(sg._edgeCount).to.equal(1);
        expect(sg._edges.data.get(0)).to.deep.equal({
          src: v1,
          link: link,
          dst: v2,
          options: {
            pref: 0,
            transitive: false,
            transitionable: false
          }
        });
        expect(sg.getEdge(e)).to.equal(sg._edges.data.get(0));
      });
      
      it('opposite', function() {
        const e = sg.addEdge(v1, link.opposite, v2);

        expect(e).to.equal(0);
        expect(sg._edgeCount).to.equal(1);
        expect(sg._edges.data.get(0)).to.deep.equal({
          src: v2,
          link: link,
          dst: v1,
          options: {
            pref: 0,
            transitive: false,
            transitionable: false
          }
        });
        expect(sg.getEdge(e)).to.equal(sg._edges.data.get(0));
      });
      
      it('options', function() {
        const o = {
          pref: 1,
          transitive: true,
          transitionable: true
        };
        const e = sg.addEdge(v1, link, v2, o);
        expect(sg._edges.data.get(e).options).to.deep.equal(o);
      });

      it('invalid options', function() {
        expect(function() { sg.addEdge(v1, link, v2, { pref: 'banana' }); }).to.throw(TypeError);
        expect(function() { sg.addEdge(v1, link, v2, { transitive: 'banana' }); }).to.throw(TypeError);
        expect(function() { sg.addEdge(v1, link, v2, { transitionable: 'banana' }); }).to.throw(TypeError);
      });
    }); // end addEdge

    //

    it('getMatch', function() {
      const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
      expect(sg.getMatch(v)).to.deep.equal({
        matcher: subgraph.matcher.id,
        data: '_test',
        options: {
          transitionable: false,
          pointer: false
        }
      });
      expect(sg.getMatch(v)).to.equal(sg._match.data.get(v));
    });

    it('getIdea', function() {
      const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
      expect(sg.getIdea(v).id).to.equal('_test');
    });

    it('allIdeas', function() {
      sg.addVertex(subgraph.matcher.id, { id: '_test' });
      const all = sg.allIdeas();
      expect(all).to.not.equal(sg._idea);
      expect(all).to.deep.equal(sg._idea);
    });

    it('deleteIdea', function() {
      const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
      sg.deleteIdea(-1);
      expect(sg.getIdea(v)).to.not.equal(undefined);
      expect(sg.concrete).to.equal(true);
      sg.deleteIdea(v);
      expect(sg.getIdea(v)).to.equal(undefined);
      expect(sg.concrete).to.equal(false);
    });

    describe('getData', function() {
      it('no idea', function() {
        const v = sg.addVertex(subgraph.matcher.filler);
        return expect(sg.getData(v)).to.eventually.equal(undefined);
      });

      it('has data', function() {
        const v = sg.addVertex(subgraph.matcher.filler);
        sg.setData(v, 'taters');
        return expect(sg.getData(v)).to.eventually.equal('taters');
      });

      it('idea without data', function() {
        const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
        return sg.getData(v).then(function(data) {
          expect(data).to.equal(undefined);
          return sg.getData(v);
        }).then(function(data) {
          expect(data).to.equal(undefined);
        });
      });

      // XXX I don't know how to NOT make this an integration test; I mean, it is, isn't it?
      it('idea with data', function() {
        const id = '_test';
        const v = sg.addVertex(subgraph.matcher.id, { id: id });
        return ideas.proxy(id).setData('banana').then(function() {
          return sg.getData(v);
        }).then(function(data) {
          expect(data).to.equal('banana');
          return sg.getData(v);
        }).then(function(data) {
          expect(data).to.equal('banana');
          return ideas.delete(id);
        });
      });
    }); // end getData

    it('setData', function() {
      const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
      sg.setData(v, 'taters');
      expect(sg._data.data.get(v)).to.equal('taters');
    });

    it('deleteData', function() {
      const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
      sg.setData(v, 'taters');
      sg.deleteData(v);
      expect(sg._data.data.get(v)).to.equal(undefined);
      expect(sg._data.data.has(v)).to.equal(true);

      sg.deleteData();
      expect(sg._data.data).to.deep.equal({});
      expect(sg._data.parent).to.equal(undefined);
    });

    //

    it('getEdge', function() {
      let v1 = sg.addVertex(subgraph.matcher.filler);
      let v2 = sg.addVertex(subgraph.matcher.filler);
      const link = links.get('thought_description');
      const e = sg.addEdge(v1, link, v2);
      expect(sg.getEdge(e)).to.deep.equal(sg._edges.data.get(e));
    });

    it('allEdges', function() {
      let v1 = sg.addVertex(subgraph.matcher.filler);
      let v2 = sg.addVertex(subgraph.matcher.filler);
      const link = links.get('thought_description');
      sg.addEdge(v1, link, v2);
      expect(sg).to.not.have.property('__all_edges__');
      expect(sg.allEdges()).to.deep.equal([sg._edges.data.get(0)]);
      expect(sg).to.have.property('__all_edges__');
      expect(sg.allEdges()).to.equal(sg.__all_edges__);
      const copy = sg.copy();
      expect(copy.__all_edges__).to.equal(sg.__all_edges__);
      sg.addEdge(v1, link, v2);
      expect(sg).to.not.have.property('__all_edges__');
      expect(sg.allEdges().length).to.equal(sg._edgeCount);
    });
  }); // end Subgraph

  describe('matcher', function() {
    it('id', function() {
      const idea = { id: '_test' };

      expect(subgraph.matcher.id(idea, idea.id)).to.equal(true);
      expect(subgraph.matcher.id(idea, '')).to.equal(false);
      expect(subgraph.matcher.id(idea, undefined)).to.equal(false);
    });

    it('filler', function() {
      expect(subgraph.matcher.filler()).to.equal(true);
      expect(subgraph.matcher.filler(undefined, '')).to.equal(true);
      expect(subgraph.matcher.filler('', 134)).to.equal(true);
    });

    it('exact', function() {
      const data = { 'thing': 3.14 };

      expect(subgraph.matcher.exact(data, {'thing': 3.14})).to.equal(true);
      expect(subgraph.matcher.exact(data, {'thing': 6.28})).to.equal(false);
      expect(subgraph.matcher.exact(data, {})).to.equal(false);
    });

    it('similar', function() {
      const data = { 'thing1': 3.14, 'thing2': 2.71 };
      const before = { 'thing1': 3.14, 'thing2': 2.71 };

      expect(subgraph.matcher.similar(data, {'thing1': 3.14})).to.equal(true);
      expect(subgraph.matcher.similar(data, {'thing2': 2.71})).to.equal(true);
      expect(subgraph.matcher.similar(data, {})).to.equal(true);
      expect(subgraph.matcher.similar(data)).to.equal(true);
      expect(subgraph.matcher.similar(data, {'thing2': 42})).to.equal(false);
      expect(subgraph.matcher.similar(data, {'others': 42})).to.equal(false);

      // the data shouldn't have been changed after any of this
      expect(data).to.deep.equal(before);
    });

    it('substring', function() {
      let data;
      expect(subgraph.matcher.substring(data, { value: 'some' })).to.equal(false);

      data = 'some STRING';
      expect(subgraph.matcher.substring(data, { value: 'some' })).to.equal(true);
      expect(subgraph.matcher.substring(data, { value: 'some', path: [] })).to.equal(true);
      expect(subgraph.matcher.substring(data, { value: 'some', path: '' })).to.equal(true);
      expect(subgraph.matcher.substring(data, { value: 'string' })).to.equal(true);

      data = { one: data };
      expect(subgraph.matcher.substring(data, { value: 'some' })).to.equal(false);
      expect(subgraph.matcher.substring(data, { value: 'some', path: ['one'] })).to.equal(true);
      expect(subgraph.matcher.substring(data, { value: 'some', path: 'one' })).to.equal(true);

      data = { two: data };
      expect(subgraph.matcher.substring(data, { value: 'some', path: 'two' })).to.equal(false);
      expect(subgraph.matcher.substring(data, { value: 'some', path: 'one' })).to.equal(false);
      expect(subgraph.matcher.substring(data, { value: 'some', path: ['two', 'one'] })).to.equal(true);
      expect(subgraph.matcher.substring(data, { value: 'some', path: 'two.one' })).to.equal(true);
      expect(subgraph.matcher.substring(data, { value: 'some', path: 'two.one.three' })).to.equal(false);
      expect(subgraph.matcher.substring(data, { value: 'some', path: 'three.two.one' })).to.equal(false);
      expect(subgraph.matcher.substring(data, { value: 'string', path: 'two.one' })).to.equal(true);
    });
  }); // end matcher

  describe('copyParentyThing', function() {
    let orig;
    let copy;
    const key = 'some_key';
    const copyParentyThing = subgraph.units.copyParentyThing;
    beforeEach(function() {
      orig = {};
      copy = {};
      orig[key] = new subgraph.units.LazyCopyObject();
      copy[key] = new subgraph.units.LazyCopyObject();
    });
    afterEach(function() {
      // when we set values on them, they should be independent
      orig[key].set('a', 11);
      copy[key].set('a', 12);
      expect(orig[key].get('a')).to.equal(11);
      expect(copy[key].get('a')).to.equal(12);
    });

    it('old is empty', function() {
      copyParentyThing(orig, copy, key);

      expect(orig[key].parent).to.equal(undefined);
      expect(copy[key].parent).to.equal(undefined);
    });

    it('old is not empty', function() {
      orig[key].set('a', 1);

      copyParentyThing(orig, copy, key);

      expect(orig[key].parent).to.not.equal(undefined);
      expect(copy[key].parent).to.not.equal(undefined);
      expect(orig[key].parent).to.equal(copy[key].parent);

      // they should retain the old values
      expect(orig[key].get('a')).to.equal(1);
      expect(copy[key].get('a')).to.equal(1);
    });
  }); // end copyParentyThing

  describe('encoding/decoding', function() {
    const the_string = '{"m":{' +
      '"0":{"matcher":"id","data":"_test","options":{"transitionable":false,"pointer":false}},' +
      '"1":{"matcher":"filler","options":{"transitionable":false,"pointer":false}},' +
      '"2":{"matcher":"filler","options":{"transitionable":false,"pointer":false}}' +
      '},"i":{"0":"_test"},"d":[[0,"some value"]],"e":{' +
      '"0":{"src":0,"link":"thought_description","dst":1,"options":{"pref":0,"transitive":false,"transitionable":false}},' +
      '"1":{"src":1,"link":"thought_description","dst":2,"options":{"pref":0,"transitive":false,"transitionable":false}}' +
      '},"vc":3,"ec":2,"c":false}';

    it('stringify', function() {
      const sg = new subgraph.units.Subgraph();
      const v1 = sg.addVertex(subgraph.matcher.id, '_test');
      const v2 = sg.addVertex(subgraph.matcher.filler);
      const v3 = sg.addVertex(subgraph.matcher.filler);
      const link = links.get('thought_description');
      sg.addEdge(v1, link, v2);
      sg.addEdge(v2, link, v3);

      sg.setData(v1, 'some value');

      expect(sg.stringify()).to.equal(the_string);
    });

    it.skip('parse');

    it.skip('they are symmetric');
  }); // end encoding/decoding
}); // end subgraph