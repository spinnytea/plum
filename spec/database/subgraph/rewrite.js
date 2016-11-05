'use strict';
const _ = require('lodash');
const bluebird = require('bluebird');
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const ideas = require('../../../src/database/ideas');
const links = require('../../../src/database/links');
const subgraph = require('../../../src/database/subgraph');
// TODO do I unit test the boundaries in spec or unit?

/**
 * (instance: bundle)
 *  |   \
 *  |    (type of: thing)
 * (property: count)
 *      \
 *       (type of: count)
 */
describe('subgraph', function() {
  describe.only('rewrite', function() {
    it('mark and his fruit', bluebird.coroutine(function*() {
      const data = {
        mark: { name: 'mark' },
        apple: { name: 'apple' },
        banana: { name: 'banana' },
        bundle_count: { name: 'bundle_count' },

        // instances
        apple_bundle: {},
        banana_bundle: {},
        apple_count: { count: 1 },
        banana_count: { count: 2 },
      };

      yield ideas.createGraph(data, [
        ['apple_bundle', 'type_of', 'apple'],
        ['apple_bundle', 'property', 'apple_count'],
        ['apple_count', 'type_of', 'bundle_count'],

        ['banana_bundle', 'type_of', 'banana'],
        ['banana_bundle', 'property', 'banana_count'],
        ['banana_count', 'type_of', 'bundle_count'],

        ['mark', 'has', 'apple_bundle'],
      ]);

      const sg = new subgraph.Subgraph();
      const sg_keys = {};
      sg_keys.mark = sg.addVertex(subgraph.matcher.id, data.mark.id);
      sg_keys.apple = sg.addVertex(subgraph.matcher.id, data.apple.id);
      sg_keys.banana = sg.addVertex(subgraph.matcher.id, data.banana.id);
      sg_keys.bundle_count = sg.addVertex(subgraph.matcher.id, data.bundle_count.id);
      sg_keys.ab = sg.addVertex(subgraph.matcher.filler);
      sg_keys.ac = sg.addVertex(subgraph.matcher.filler, undefined, { transitionable: true });
      sg_keys.bb = sg.addVertex(subgraph.matcher.filler);
      sg_keys.bc = sg.addVertex(subgraph.matcher.filler, undefined, { transitionable: true });
      sg_keys.ab_apple = sg.addEdge(sg_keys.ab, links.get('type_of'), sg_keys.apple);
      sg_keys.ab_ac = sg.addEdge(sg_keys.ab, links.get('property'), sg_keys.ac);
      sg_keys.ac_buncle_count = sg.addEdge(sg_keys.ac, links.get('type_of'), sg_keys.bundle_count);
      sg_keys.bb_banana = sg.addEdge(sg_keys.bb, links.get('type_of'), sg_keys.banana);
      sg_keys.bb_bc = sg.addEdge(sg_keys.bb, links.get('property'), sg_keys.bc);
      sg_keys.bc_bundle_count = sg.addEdge(sg_keys.bc, links.get('type_of'), sg_keys.bundle_count);
      sg_keys.mark_has_bundle = sg.addEdge(sg_keys.mark, links.get('has'), sg_keys.ab, { transitionable: true });

      let sg_r = yield subgraph.search(sg);
      expect(sg_r).to.be.an('array');
      expect(sg_r.length).to.equal(1);
      sg_r = sg_r[0];
      expect(sg_r.concrete).to.equal(true);

      // okay, setup done
      // do a transition

      const sg_one = yield subgraph.rewrite(sg_r, [{ vertex_id: sg_keys.ac, replace: { count: 4 } }]);
      expect(sg_one).to.not.equal(undefined);
      expect(sg_one).to.not.equal(sg_r);
      expect(yield sg_r.getData(sg_keys.ac)).to.deep.equal({ count: 1 });
      expect(yield sg_one.getData(sg_keys.ac)).to.deep.equal({ count: 4 });
      expect(yield data.apple_count.data()).to.deep.equal({ count: 1 });

      const sg_two = yield subgraph.rewrite(sg_one, [{ edge_id: sg_keys.mark_has_bundle, replace_dst: sg_keys.bb }]);
      expect(sg_two).to.not.equal(undefined);
      expect(sg_two).to.not.equal(sg_one);
      expect(_.pick(sg_one.getEdge(sg_keys.mark_has_bundle), ['src', 'dst'])).to.deep.equal({ src: sg_keys.mark, dst: sg_keys.ab });
      expect(_.pick(sg_two.getEdge(sg_keys.mark_has_bundle), ['src', 'dst'])).to.deep.equal({ src: sg_keys.mark, dst: sg_keys.bb });
      expect(yield data.mark.links(links.get('has'))).to.deep.equal([data.apple_bundle]);
      expect(yield data.apple_bundle.links(links.get('has').opposite)).to.deep.equal([data.mark]);
      expect(yield data.banana_bundle.links(links.get('has').opposite)).to.deep.equal([]);

      // though experiment done
      // apply the transitions

      // FIXME call again with actual
    }));
  }); // end rewrite
}); // end subgraph