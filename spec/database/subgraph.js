'use strict';
const expect = require('chai').use(require('chai-as-promised')).expect;
const ideas = require('../../src/database/ideas');
const links = require('../../src/database/links');
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  describe('Subgraph', function() {
    let sg;
    beforeEach(function() { sg = new subgraph.units.Subgraph(); });

    describe('getData', function() {
      it('idea without data', function() {
        const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
        return sg.getData(v).then(function(data) {
          expect(data).to.equal(undefined);
          return sg.getData(v);
        }).then(function(data) {
          expect(data).to.equal(undefined);
        });
      });
      
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
  }); // end Subgraph

  describe('matcher', function() {
    // matcher.id shouldn't ever actually be used in subgraph.search
    // it doesn't even really make sense in the context of matchRef (since it doesn't use data)
    it.skip('id', function() {
      var mark = ideas.create();
      var apple = ideas.create();
      mark.link(links.get('thought_description'), apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.id, apple.id);
      sg.addEdge(m, links.get('thought_description'), a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);
    });

    it.skip('filler', function() {
      var mark = ideas.create();
      var apple = ideas.create();
      mark.link(links.get('thought_description'), apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(m, links.get('thought_description'), a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);
    });

    it.skip('exact', function() {
      var mark = ideas.create();
      var apple = ideas.create({'thing': 3.14});
      mark.link(links.get('thought_description'), apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.exact, {'thing': 3.14});
      sg.addEdge(m, links.get('thought_description'), a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.exact, {'thing': 2.71});
      sg.addEdge(m, links.get('thought_description'), a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });

    it.skip('similar', function() {
      var mark = ideas.create();
      var apple = ideas.create({'thing1': 3.14, 'thing2': 2.71});
      mark.link(links.get('thought_description'), apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.similar, {'thing1': 3.14});
      sg.addEdge(m, links.get('thought_description'), a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.similar, {'asdfasdfasdf': 1234});
      sg.addEdge(m, links.get('thought_description'), a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });

    it.skip('substring', function() {
      var mark = ideas.create();
      var apple = ideas.create({'thing': 'ExPeNsIvE'});
      mark.link(links.get('thought_description'), apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.substring, { value: 'eXpEnSiVe', path: 'thing' });
      sg.addEdge(m, links.get('thought_description'), a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.substring, { value: 'not very spensive', path: 'thinger' });
      sg.addEdge(m, links.get('thought_description'), a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });
  }); // end matcher
}); // end subgraph