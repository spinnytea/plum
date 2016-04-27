'use strict';
const expect = require('chai').expect;
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  describe('LazyCopyObject', function() {
    it('invalid constructor args', function() {
      expect(function() { new subgraph.units.LazyCopyObject(false); }).to.throw(TypeError); // jshint ignore:line
    });

    it('set', function() {
      const lco = new subgraph.units.LazyCopyObject();
      const key = '0';
      expect(lco.data[key]).to.equal(undefined);

      lco.set('0', 0);

      expect(lco.data[key]).to.equal(0);
      expect(lco.get(key)).to.equal(0);
    });

    describe('get', function() {
      describe('no parent', function() {
        const lco = new subgraph.units.LazyCopyObject();
        lco.data['0'] = 0;

        it('found', function() {
          expect(lco.get('0')).to.equal(0);
        });

        it('not found', function() {
          expect(lco.get('1')).to.equal(undefined);
        });
      }); // end no parent

      describe('has parent', function() {
        const lco = new subgraph.units.LazyCopyObject();
        const par = new subgraph.units.LazyCopyObject();
        lco.parent = par;
        lco.data['c'] = 0;
        par.data['p'] = 1;

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
          over.data['c'] = 2;
          over.data['p'] = 3;
          expect(over.get('c')).to.equal(2);
          expect(over.get('p')).to.equal(3);
        });
      }); // end has parent
    }); // end get
  }); // end LazyCopyObject

  describe('Subgraph', function() {
    it('construct', function() {
      var sg = new subgraph.units.Subgraph();
      expect(sg).to.have.property('_match');
    });

    it('copy', function() {
      const orig = new subgraph.units.Subgraph();
      const copy = orig.copy();
      expect(copy).to.deep.equal(orig);
    });
    
    describe('addVertex', function() {
      let sg;
      beforeEach(function() { sg = new subgraph.units.Subgraph(); });

      it('invalid matcher', function() {
        expect(function() { sg.addVertex(null); }).to.throw('invalid matcher');
        expect(function() { sg.addVertex(function() {}); }).to.throw('invalid matcher');
      });

      it('no data in non-filler', function() {
        expect(function() { sg.addVertex(subgraph.matcher.id); }).to.throw('match data must be defined');
      });

      it('filler', function() {
        sg.addVertex(subgraph.matcher.filler);

        expect(sg._vertexCount).to.equal(1);
        expect(sg.concrete).to.equal(false);
        expect(sg._match[0]).to.deep.equal({
          matcher: subgraph.matcher.filler,
          data: undefined,
          options: {
            transitionable: false,
            variable: false
          }
        });
      });

      it('id', function() {
        sg.addVertex(subgraph.matcher.id, { id: '_test' });
        sg.addVertex(subgraph.matcher.id, '_test2');

        expect(sg._vertexCount).to.equal(2);
        expect(sg.concrete).to.equal(true);
        expect(sg._match[0]).to.deep.equal({
          matcher: subgraph.matcher.id,
          data: '_test',
          options: {
            transitionable: false,
            variable: false
          }
        });
        expect(sg._match[1]).to.deep.equal({
          matcher: subgraph.matcher.id,
          data: '_test2',
          options: {
            transitionable: false,
            variable: false
          }
        });
      });
    }); // end addVertex
  }); // end Subgraph

  describe('matcher', function() {
    it('id', function() {
      var idea = { id: '_test' };

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
      var data = { 'thing': 3.14 };

      expect(subgraph.matcher.exact(data, {'thing': 3.14})).to.equal(true);
      expect(subgraph.matcher.exact(data, {'thing': 6.28})).to.equal(false);
      expect(subgraph.matcher.exact(data, {})).to.equal(false);
    });

    it('similar', function() {
      var data = { 'thing1': 3.14, 'thing2': 2.71 };
      var before = { 'thing1': 3.14, 'thing2': 2.71 };

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
      var data;
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
}); // end subgraph