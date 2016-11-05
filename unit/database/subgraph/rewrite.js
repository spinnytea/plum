'use strict';
const _ = require('lodash');
const expect = require('chai').use(require('chai-things')).use(require('sinon-chai')).expect;
const sinon = require('sinon');
const subgraph = require('../../../src/database/subgraph');

describe('subgraph', function() {
  describe('rewrite', function() {
    const units = _.assign({}, subgraph.rewrite.units);
    const boundaries = _.assign({}, subgraph.rewrite.boundaries);
    let sg, dummy_vertex_transition, dummy_edge_transition;
    after(function() {
      _.assign(subgraph.rewrite.units, units);
      _.assign(subgraph.rewrite.boundaries, boundaries);
    });
    beforeEach(function() {
      // spy on the functions
      _.keys(subgraph.rewrite.units).forEach(function(name) {
        subgraph.rewrite.units[name] = sinon.stub();
      });
      _.keys(subgraph.rewrite.boundaries).forEach(function(name) {
        subgraph.rewrite.boundaries[name] = sinon.stub().returns(Promise.resolve());
      });

      sg = {
        concrete: true,
        copy: sinon.stub().returns('copy'),
        getMatch: sinon.stub().returns({ options: { transitionable: true } }), // some valid matcher
        getData: sinon.stub().returns(Promise.resolve()),
        setData: sinon.stub(),
        getEdge: sinon.stub().returns({ src: 1, dst: 2, options: { transitionable: true } }), // some valid edge
        updateEdge: sinon.stub(),
      };
      dummy_vertex_transition = { vertex_id: 'some vertex id', replace: {} }; // some valid vertex transition
      dummy_edge_transition = { edge_id: 'some edge id', replace_src: 'some src id' }; // some valid edge transition
    });

    // Note: this function is all integration
    describe('rewrite', function() {
      const tv = { vertex_id: 'some vertex' };
      const te = { edge_id: 'some edge' };
      const ts = [ tv, te ];
      beforeEach(function() {
        subgraph.rewrite.units.checkVertex.returns(Promise.resolve(true));
        subgraph.rewrite.units.checkEdge.returns(Promise.resolve(true));
        subgraph.rewrite.units.transitionVertex.returns(Promise.resolve());
        subgraph.rewrite.units.transitionEdge.returns(Promise.resolve());
      });

      it('noop', function() {
        return units.rewrite(sg, [], false).then(function(result) {
          expect(result).to.equal('copy');
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(0);
          expect(sg.copy).to.have.callCount(1);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(0);
        });
      });

      it('noop actual', function() {
        return units.rewrite(sg, [], true).then(function(result) {
          expect(result).to.equal(sg);
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(0);
          expect(sg.copy).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(0);
        });
      });

      it('not concrete', function() {
        sg.concrete = false;
        return units.rewrite(sg, ts).then(function(result) {
          expect(result).to.equal(undefined);
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(0);
          expect(sg.copy).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(0);
        });
      });

      it('one vertex fails', function() {
        subgraph.rewrite.units.checkVertex.returns(Promise.resolve(false));
        return units.rewrite(sg, ts).then(function(result) {
          expect(result).to.equal(undefined);
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkVertex).to.have.been.calledWithExactly(sg, tv);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkEdge).to.have.been.calledWithExactly(sg, te);
          expect(sg.copy).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(0);
        });
      });

      it('one edge fails', function() {
        subgraph.rewrite.units.checkEdge.returns(Promise.resolve(false));
        return units.rewrite(sg, ts).then(function(result) {
          expect(result).to.equal(undefined);
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkVertex).to.have.been.calledWithExactly(sg, tv);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkEdge).to.have.been.calledWithExactly(sg, te);
          expect(sg.copy).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(0);
        });
      });

      it('one t fails', function() {
        subgraph.rewrite.units.checkVertex.returns(Promise.resolve(false));
        return units.rewrite(sg, [{}]).then(function(result) {
          expect(result).to.equal(undefined);
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(0);
          expect(sg.copy).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(0);
        });
      });

      it('success', function() {
        return units.rewrite(sg, ts).then(function(result) {
          expect(result).to.equal('copy');
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkVertex).to.have.been.calledWithExactly(sg, tv);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkEdge).to.have.been.calledWithExactly(sg, te);
          expect(sg.copy).to.have.callCount(1);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(1);
          expect(subgraph.rewrite.units.transitionVertex).to.have.been.calledWithExactly('copy', tv, false);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(1);
          expect(subgraph.rewrite.units.transitionEdge).to.have.been.calledWithExactly('copy', te, false);
        });
      });

      it('success actual', function() {
        return units.rewrite(sg, ts, true).then(function(result) {
          expect(result).to.equal(sg);
          expect(subgraph.rewrite.units.checkVertex).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkVertex).to.have.been.calledWithExactly(sg, tv);
          expect(subgraph.rewrite.units.checkEdge).to.have.callCount(1);
          expect(subgraph.rewrite.units.checkEdge).to.have.been.calledWithExactly(sg, te);
          expect(sg.copy).to.have.callCount(0);
          expect(subgraph.rewrite.units.transitionVertex).to.have.callCount(1);
          expect(subgraph.rewrite.units.transitionVertex).to.have.been.calledWithExactly(sg, tv, true);
          expect(subgraph.rewrite.units.transitionEdge).to.have.callCount(1);
          expect(subgraph.rewrite.units.transitionEdge).to.have.been.calledWithExactly(sg, te, true);
        });
      });
    }); // end rewrite

    describe('checkVertex', function() {
      it('no transition', function() {
        return units.checkVertex(sg).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getMatch).to.have.callCount(0);
          expect(sg.getData).to.have.callCount(0);
        });
      });

      it('not a vertex transition', function() {
        return units.checkVertex(sg, {}).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getMatch).to.have.callCount(0);
          expect(sg.getData).to.have.callCount(0);
        });
      });

      it('unsupported transition', function() {
        return units.checkVertex(sg, { vertex_id: 'some vertex id', unsupported: true }).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getMatch).to.have.callCount(0);
          expect(sg.getData).to.have.callCount(0);
        });
      });

      it('vertex does not exist', function() {
        sg.getMatch.returns(undefined);
        return units.checkVertex(sg, dummy_vertex_transition).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly(dummy_vertex_transition.vertex_id);
          expect(sg.getData).to.have.callCount(0);
        });
      });

      it('vertex not transitionable', function() {
        sg.getMatch.returns({ options: { transitionable: false } });
        return units.checkVertex(sg, dummy_vertex_transition).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly(dummy_vertex_transition.vertex_id);
          expect(sg.getData).to.have.callCount(0);
        });
      });

      it('vertex without data', function() {
        sg.getData.returns(Promise.resolve(undefined));
        return units.checkVertex(sg, dummy_vertex_transition).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly(dummy_vertex_transition.vertex_id);
          expect(sg.getData).to.have.callCount(1);
          expect(sg.getData).to.have.been.calledWithExactly(dummy_vertex_transition.vertex_id);
        });
      });

      it('replace w/o unit', function() {
        let vertex_id = 'replace w/o unit';
        sg.getData.returns(Promise.resolve({ some: 'value' }));
        return units.checkVertex(sg, { vertex_id: vertex_id, replace: { another: 'value' } }).then(function(result) {
          expect(result).to.equal(true);
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly(vertex_id);
          expect(sg.getData).to.have.callCount(1);
          expect(sg.getData).to.have.been.calledWithExactly(vertex_id);
        });
      });

      it('replace with unit', function() {
        let vertex_id = 'replace with unit';
        sg.getData.returns(Promise.resolve({ some: 'value', unit: 'taters' }));
        return units.checkVertex(sg, { vertex_id: vertex_id, replace: { another: 'value', unit: 'taters' } }).then(function(result) {
          expect(result).to.equal(true);
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly(vertex_id);
          expect(sg.getData).to.have.callCount(1);
          expect(sg.getData).to.have.been.calledWithExactly(vertex_id);
        });
      });

      it('replace_id w/o unit', function() {
        // Note: having two different return values isn't necessary for the test
        sg.getData.returns(Promise.resolve({ some: 'value' }));
        return units.checkVertex(sg, { vertex_id: 'first id w/o', replace_id: 'second id w/o' }).then(function(result) {
          expect(result).to.equal(true);
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly('first id w/o');
          expect(sg.getData).to.have.callCount(2);
          expect(sg.getData).to.have.been.calledWithExactly('first id w/o');
          expect(sg.getData).to.have.been.calledWithExactly('second id w/o');
        });
      });

      it('replace_id with unit', function() {
        // Note: having two different return values isn't necessary for the test
        sg.getData.returns(Promise.resolve({ some: 'value', unit: 'taters' }));
        return units.checkVertex(sg, { vertex_id: 'first id with', replace_id: 'second id with' }).then(function(result) {
          expect(result).to.equal(true);
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly('first id with');
          expect(sg.getData).to.have.callCount(2);
          expect(sg.getData).to.have.been.calledWithExactly('first id with');
          expect(sg.getData).to.have.been.calledWithExactly('second id with');
        });
      });
    }); // end checkVertex

    describe('transitionVertex', function() {
      it('replace !actual', function() {
        return units.transitionVertex(sg, { vertex_id: 'some id', replace: { another: 'value' } }, false).then(function() {
          expect(sg.getData).to.have.callCount(0);
          expect(sg.setData).to.have.callCount(1);
          expect(sg.setData).to.have.been.calledWithExactly('some id', { another: 'value' });
          expect(subgraph.rewrite.boundaries.updateData).to.have.callCount(0);
        });
      });

      it('replace actual', function() {
        return units.transitionVertex(sg, { vertex_id: 'some id', replace: { another: 'value' } }, true).then(function() {
          expect(sg.getData).to.have.callCount(0);
          expect(sg.setData).to.have.callCount(1);
          expect(sg.setData).to.have.been.calledWithExactly('some id', { another: 'value' });
          expect(subgraph.rewrite.boundaries.updateData).to.have.callCount(1);
          expect(subgraph.rewrite.boundaries.updateData).to.have.been.calledWithExactly(sg, 'some id');
        });
      });

      it('replace_id !actual', function() {
        sg.getData.returns(Promise.resolve('some replacement value'));
        return units.transitionVertex(sg, { vertex_id: 'some id', replace_id: 'another id' }, false).then(function() {
          expect(sg.getData).to.have.callCount(1);
          expect(sg.getData).to.have.been.calledWithExactly('another id');
          expect(sg.setData).to.have.callCount(1);
          expect(sg.setData).to.have.been.calledWithExactly('some id', 'some replacement value');
          expect(subgraph.rewrite.boundaries.updateData).to.have.callCount(0);
        });
      });

      it('replace_id actual', function() {
        sg.getData.returns(Promise.resolve('some replacement value'));
        return units.transitionVertex(sg, { vertex_id: 'some id', replace_id: 'another id' }, true).then(function() {
          expect(sg.getData).to.have.callCount(1);
          expect(sg.getData).to.have.been.calledWithExactly('another id');
          expect(sg.setData).to.have.callCount(1);
          expect(sg.setData).to.have.been.calledWithExactly('some id', 'some replacement value');
          expect(subgraph.rewrite.boundaries.updateData).to.have.callCount(1);
          expect(subgraph.rewrite.boundaries.updateData).to.have.been.calledWithExactly(sg, 'some id');
        });
      });
    }); // end transitionVertex

    describe('checkEdge', function() {
      it('no transition', function() {
        return units.checkEdge(sg).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getEdge).to.have.callCount(0);
          expect(sg.getMatch).to.have.callCount(0);
        });
      });

      it('not an edge transition', function() {
        return units.checkEdge(sg, {}).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getEdge).to.have.callCount(0);
          expect(sg.getMatch).to.have.callCount(0);
        });
      });

      it('unsupported transition', function() {
        return units.checkEdge(sg, { edge_id: 'some edge id', unsupported: true }).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getEdge).to.have.callCount(0);
          expect(sg.getMatch).to.have.callCount(0);
        });
      });

      it('edge does not exist', function() {
        sg.getEdge.returns(undefined);
        return units.checkEdge(sg, dummy_edge_transition).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly(dummy_edge_transition.edge_id);
          expect(sg.getMatch).to.have.callCount(0);
        });
      });

      it('edge not transitionable', function() {
        sg.getEdge.returns({ options: { transitionable: false } });
        return units.checkEdge(sg, dummy_edge_transition).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly(dummy_edge_transition.edge_id);
          expect(sg.getMatch).to.have.callCount(0);
        });
      });

      it('replace_src does not exist', function() {
        sg.getMatch.returns(undefined);
        return units.checkEdge(sg, { edge_id: 'rs dne', replace_src: 'some src' }).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('rs dne');
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly('some src');
        });
      });

      it('replace_src exists', function() {
        return units.checkEdge(sg, { edge_id: 'rs dne', replace_src: 'some src' }).then(function(result) {
          expect(result).to.equal(true);
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('rs dne');
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly('some src');
        });
      });

      it('replace_dst does not exist', function() {
        sg.getMatch.returns(undefined);
        return units.checkEdge(sg, { edge_id: 'rs dne', replace_dst: 'some dst' }).then(function(result) {
          expect(result).to.equal(false);
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('rs dne');
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly('some dst');
        });
      });

      it('replace_dst exists', function() {
        return units.checkEdge(sg, { edge_id: 'rs dne', replace_dst: 'some dst' }).then(function(result) {
          expect(result).to.equal(true);
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('rs dne');
          expect(sg.getMatch).to.have.callCount(1);
          expect(sg.getMatch).to.have.been.calledWithExactly('some dst');
        });
      });
    }); // end checkEdge

    describe('transitionEdge', function() {
      it('replace_src', function() {
        return units.transitionEdge(sg, { edge_id: 'some edge', replace_src: 3 }, false).then(function() {
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('some edge');
          expect(sg.updateEdge).to.have.callCount(1);
          expect(sg.updateEdge).to.have.been.calledWithExactly('some edge', 3, 2);
          expect(subgraph.rewrite.boundaries.updateLink).to.have.callCount(0);
        });
      });

      it('replace_dst', function() {
        return units.transitionEdge(sg, { edge_id: 'some edge', replace_dst: 3 }, false).then(function() {
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('some edge');
          expect(sg.updateEdge).to.have.callCount(1);
          expect(sg.updateEdge).to.have.been.calledWithExactly('some edge', 1, 3);
          expect(subgraph.rewrite.boundaries.updateLink).to.have.callCount(0);
        });
      });

      it('actual replace', function() {
        return units.transitionEdge(sg, { edge_id: 'some edge', replace_dst: 3 }, true).then(function() {
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('some edge');
          expect(sg.updateEdge).to.have.callCount(1);
          expect(sg.updateEdge).to.have.been.calledWithExactly('some edge', 1, 3);
          expect(subgraph.rewrite.boundaries.updateLink).to.have.callCount(1);
          expect(subgraph.rewrite.boundaries.updateLink).to.have.been.calledWithExactly(sg, undefined, 1, 2, 1, 3);
        });
      });

      it('actual replace w/o change', function() {
        return units.transitionEdge(sg, { edge_id: 'some edge', replace_dst: 2 }, true).then(function() {
          expect(sg.getEdge).to.have.callCount(1);
          expect(sg.getEdge).to.have.been.calledWithExactly('some edge');
          expect(sg.updateEdge).to.have.callCount(1);
          expect(sg.updateEdge).to.have.been.calledWithExactly('some edge', 1, 2);
          expect(subgraph.rewrite.boundaries.updateLink).to.have.callCount(0);
        });
      });
    }); // end transitionEdge
  }); // end rewrite
}); // end subgraph