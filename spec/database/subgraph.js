'use strict';
const Bluebird = require('bluebird');
const expect = require('chai').use(require('chai-as-promised')).expect;
const ideas = require('../../src/database/ideas');
const links = require('../../src/database/links');
const subgraph = require('../../src/database/subgraph');

describe('subgraph', function() {
  describe('Subgraph', function() {
    let sg;
    beforeEach(function() { sg = new subgraph.Subgraph(); });

    describe('getData', function() {
      it('idea without data', Bluebird.coroutine(function*() {
        const v = sg.addVertex(subgraph.matcher.id, { id: '_test' });
        expect(yield sg.getData(v)).to.equal(undefined);
        expect(yield sg.getData(v)).to.equal(undefined);
      }));
      
      it('idea with data', Bluebird.coroutine(function*() {
        const id = '_test';
        const v = sg.addVertex(subgraph.matcher.id, { id: id });
        yield ideas.proxy(id).setData('banana');
        expect(yield sg.getData(v)).to.equal('banana');
        expect(yield sg.getData(v)).to.equal('banana');
        yield ideas.delete(id);
      }));
    }); // end getData
  }); // end Subgraph

  describe('matcher', function() {
    it('id', Bluebird.coroutine(function*() {
      const data = { mark: undefined, apple: undefined, fruit: undefined };
      yield ideas.createGraph(data, [ ['mark', 'thought_description', 'apple'] ]);
      yield data.fruit.setData(data.apple.id);

      const sg = new subgraph.Subgraph();
      const m = sg.addVertex(subgraph.matcher.id, data.mark);
      const f = sg.addVertex(subgraph.matcher.id, data.fruit);
      const a = sg.addVertex(subgraph.matcher.id, f, { pointer: true });
      sg.addEdge(m, links.get('thought_description'), a);

      let result = yield subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(result[0]).to.not.equal(sg);
      expect(result[0].getIdea(m).id).to.equal(data.mark.id);
      expect(result[0].getIdea(a).id).to.equal(data.apple.id);

      // fail
      yield data.fruit.setData('_no_an_idea_');

      result = yield subgraph.search(sg);
      expect(result.length).to.equal(0);
    }));

    it('filler', Bluebird.coroutine(function*() {
      const data = { mark: undefined, apple: undefined };
      yield ideas.createGraph(data, [ ['mark', 'thought_description', 'apple'] ]);

      const sg = new subgraph.Subgraph();
      const m = sg.addVertex(subgraph.matcher.id, data.mark);
      const a = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(m, links.get('thought_description'), a);

      let result = yield subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(result[0]).to.not.equal(sg);
      expect(result[0].getIdea(m).id).to.equal(data.mark.id);
      expect(result[0].getIdea(a).id).to.equal(data.apple.id);
    }));

    it('exact', Bluebird.coroutine(function*() {
      const data = { mark: undefined, apple: {'thing': 3.14} };
      yield ideas.createGraph(data, [ ['mark', 'thought_description', 'apple'] ]);

      const sg = new subgraph.Subgraph();
      const m = sg.addVertex(subgraph.matcher.id, data.mark);
      const a = sg.addVertex(subgraph.matcher.exact, {'thing': 3.14});
      sg.addEdge(m, links.get('thought_description'), a);

      let result = yield subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(result[0]).to.not.equal(sg);
      expect(result[0].getIdea(m).id).to.equal(data.mark.id);
      expect(result[0].getIdea(a).id).to.equal(data.apple.id);

      // fail
      sg.getMatch(a).data = {'thing': 2.71};

      result = yield subgraph.search(sg);
      expect(result.length).to.equal(0);
    }));

    it('similar', Bluebird.coroutine(function*() {
      const data = { mark: undefined, apple: {'thing1': 3.14, 'thing2': 2.71} };
      yield ideas.createGraph(data, [ ['mark', 'thought_description', 'apple'] ]);

      const sg = new subgraph.Subgraph();
      const m = sg.addVertex(subgraph.matcher.id, data.mark);
      const a = sg.addVertex(subgraph.matcher.similar, {'thing1': 3.14});
      sg.addEdge(m, links.get('thought_description'), a);

      let result = yield subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(result[0]).to.not.equal(sg);
      expect(result[0].getIdea(m).id).to.equal(data.mark.id);
      expect(result[0].getIdea(a).id).to.equal(data.apple.id);

      // fail
      sg.getMatch(a).data = {'asdfasdfasdf': 1234};

      result = yield subgraph.search(sg);
      expect(result.length).to.equal(0);
    }));

    it('substring', Bluebird.coroutine(function*() {
      const data = { mark: undefined, apple: {'thing': 'ExPeNsIvE'} };
      yield ideas.createGraph(data, [ ['mark', 'thought_description', 'apple'] ]);

      const sg = new subgraph.Subgraph();
      const m = sg.addVertex(subgraph.matcher.id, data.mark);
      const a = sg.addVertex(subgraph.matcher.substring, { value: 'eXpEnSiVe', path: 'thing' });
      sg.addEdge(m, links.get('thought_description'), a);

      var result = yield subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(result[0]).to.not.equal(sg);
      expect(result[0].getIdea(m).id).to.equal(data.mark.id);
      expect(result[0].getIdea(a).id).to.equal(data.apple.id);

      // fail
      sg.getMatch(a).data = { value: 'not very spensive', path: 'thinger' };

      result = yield subgraph.search(sg);
      expect(result.length).to.equal(0);
    }));
  }); // end matcher
}); // end subgraph