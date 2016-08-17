'use strict';
const _ = require('lodash');
const bluebird = require('bluebird');
const subgraph = require('../subgraph');
// TODO review file after testing is done

// find a list of subgraphs in the database that matches the supplied subgraph
//
// use Prim's algorithm to expand the known subgraph
// we are trying to identify all of the vertices
// we use edges to find new ones
//
// Note: it's best if the subgraph is flat before running this
module.exports = exports = function search(sg) {
  if(sg.concrete) return Promise.resolve([sg]);

  // sort high[0,1,...] to low[...,11,12]
  let edges = _.sortBy(sg.allEdges(), 'options.pref').reverse();

  return exports.units.recursiveSearch(sg, edges);
};

function recursiveSearch(sg, edges) {
  return bluebird.coroutine(function*() {
    // prune and validate edges that are finished
    edges = exports.units.verifyEdges(sg, edges);
    if(!edges) return [];

    const selected = yield exports.units.findEdgeToExpand(sg, edges);
    const nextSteps = (selected ? yield exports.units.expandEdge(sg, selected) : []);

    // there isn't an edge to expand
    if(nextSteps.length === 0) {
      // check all vertices to ensure they all have ideas defined
      if(sg._vertexCount !== sg._idea.size || edges.length)
        return [];

      sg.concrete = true;
      return [sg];
    } else {
      // do the next iteration of searches
      let ret = [];
      edges = _.remove(edges, selected.edge);
      return bluebird.coroutine(function*() {
        for(let sg of nextSteps) {
          Array.prototype.push.apply(ret, yield exports.units.recursiveSearch(sg, edges));
        }
        return ret;
      })();
    }
  })();
}

Object.defineProperty(exports, 'units', { value: {} });
exports.units.recursiveSearch = recursiveSearch;
exports.units.verifyEdges = verifyEdges;
exports.units.verifyEdge = verifyEdge;
exports.units.findEdgeToExpand = findEdgeToExpand;
exports.units.updateSelected = updateSelected;
exports.units.getBranches = getBranches;
exports.units.expandEdge = expandEdge;

// 1) make a copy of edges (we don't want to prune the original)
// 2) collect the edges that have src and dst, since we don't need to consider them
// 3) only retain the edges that are not done in "edges"
// return the pruned array of edges if the finished ones are valid
// return undefined if the subgraph is invalid
function verifyEdges(sg, edges) {
  let done = [];

  edges = edges.filter(function(edge) {
    if(sg.hasIdea(edge.src) && sg.hasIdea(edge.dst)) {
      done.push(edge);
      return false;
    } else {
      return true;
    }
  });

  // if any of the edges are invalid, then this subgraph match is invalid
  if(!done.every(function(edge) { return exports.units.verifyEdge(sg, edge); }))
    return undefined;

  return edges;
}

// specifically for when src and dst have ideas
// just check to see that there is an edge between them
// return true or false: is the edge valid
//
// we could just run "getBranches(sg, edge, true).contains(edge.dst)" or "getBranches(sg, edge, false).contains(edge.src)"
// but this will be more efficient
// in the transitive case, we don't need to build a complete list, we just need to check for presence along the way
function verifyEdge(sg, edge) {
  return bluebird.coroutine(function*() {
    if(edge.options.transitive || edge.link.options.transitive) {
      // since (Given a->b) A is more specific and B is more general, we will start at A and go towards B
      // (mark --type_of-> person) we don't want to explore ALL the specific cases
      //
      // search for transitive link
      const next = [sg.getIdea(edge.src)]; // a list of all the places to visit; using push and pop for speed; traversal order doesn't matter
      const link = edge.link; // the link to follow
      const visited = new Set(); // an index of all the places we've been
      const targetId = sg.getIdea(edge.dst).id;

      let idea;
      while(next.length) {
        idea = next.pop();
        if(visited.has(idea.id)) continue;
        visited.add(idea.id);

        // XXX reformat/refactor this so it looks cleaner
        if((yield idea.links(link)).some(function(p) {
            if(p.id === targetId) return true;
            next.push(p);
            return false;
          })) return true;
      }

      return false;
    } else {
      const ideas = yield sg.getIdea(edge.src).link(edge.link);
      const targetId = sg.getIdea(edge.dst).id;
      return ideas.some(function(idea) { return idea.id === targetId; });
    }
  })();
}

// find an edge what's partially on the graph, and partially off the graph
function findEdgeToExpand(sg, edges) {
  return bluebird.coroutine(function*() {
    let selected = null;

    for(let edge of edges) {
      // since the edges are sorted by pref, we can exit early
      if(selected && edge.options.pref < selected.edge.options.pref)
        return selected;

      selected = yield exports.units.updateSelected(sg, edge, selected);
    }

    return selected;
  })();
}

// checks edge against select to see if it's a better match
// one side must be attached to the graph, one edge must be unknown
// picks the one with the lower pref; or if the same pref, picks the one with the lower branch factor
function updateSelected(sg, edge, selected) {
  // if we've already pick an edge with a higher pref, then we don't need to consider this edge
  if(selected && selected.edge.options.pref > edge.options.pref)
    return Promise.resolve(selected);

  const isSrc = sg.hasIdea(edge.src);
  const isDst = sg.hasIdea(edge.dst);
  // if they are both true or both false, then we shouldn't consider this edge
  // (side note: they shouldn't be in the list anymore if they are both true)
  // we only want to select this edge if one is specified and the other is not
  if(isSrc === isDst) return Promise.resolve(selected);

  // we can't consider this edge if the target object hasn't be identified
  // FIXME expandEdge does a deeper traversal of the matches, so should this
  const match = sg.getMatch(isSrc?edge.dst:edge.src);
  if(match.options.pointer && !sg.hasIdea(match.data))
    return Promise.resolve(selected);

  return exports.units.getBranches(sg, edge, isSrc).then(function(currBranches) {
    if(!selected || selected.edge.options.pref < edge.options.pref || currBranches.length < selected.branches.length) {
      return {
        edge: edge,
        branches: currBranches,
        isForward: isSrc,
      };
    }

    return selected;
  });
}

function getBranches(sg, edge, isForward) {
  return bluebird.coroutine(function*() {
    if(edge.options.transitive || edge.link.options.transitive) {
      // collect all vertices along the link
      const next = [sg.getIdea(isForward?edge.src:edge.dst)]; // a list of all the places to visit; using push and pop for speed; traversal order doesn't matter
      const link = (isForward?edge.link:edge.link.opposite); // the link to follow
      const visited = new Set(); // an index of all the places we've been
      const branches = new Map(); // the return list of everything we've found (indexed to de-dup, return the values)

      let idea;
      while(next.length) {
        idea = next.pop();
        if(visited.has(idea.id)) continue;
        visited.add(idea.id);

        (yield idea.links(link)).forEach(function(p) {
          next.push(p);
          branches.set(p.id, p);
        });
      }

      return Array.from(branches.values());
    } else {
      // follow the link and get the ideas
      if(isForward)
        return yield sg.getIdea(edge.src).link(edge.link);
      else
        return yield sg.getIdea(edge.dst).link(edge.link.opposite);
    }
  })();
}

function expandEdge(sg, selected) {
  return bluebird.coroutine(function*() {
    const target_vertex_id = (selected.isForward ? selected.edge.dst : selected.edge.src);
    let match = sg.getMatch(target_vertex_id);
    let matchData = match.data;

    // following the pointer requires a more complex pre match thing
    // if this points to a pointer, we need to follow that as well
    if(match.options.pointer) {
      // XXX stop early if there is data defined? will there ever be data defined?
      let m = sg.getMatch(matchData);
      while(m.options.pointer) {
        matchData = m.data;
        m = sg.getMatch(matchData);
      }
      matchData = yield sg.getData(matchData);
    }

    // filter all the branches that match
    // but the hard case gets the data, which requires a promise
    // - so we need to map all the results as a promise so we can wait for them all to resolve
    // - onse that's done, we can perform the filter
    // - the map return either the idea or undefined, so we can filter on the identity
    let matchedBranches = (yield Promise.all(selected.branches.map(function(idea) {
      let p;
      if(match.matcher === subgraph.matcher.id)
        p = Promise.resolve(match.matcher(idea, matchData));
      else if(match.matcher === subgraph.matcher.filler)
        p = Promise.resolve(true);
      else
        p = idea.data().then((d)=>match.matcher(d, matchData));
      return p.then(function(bool) {
        if(bool) return idea;
        return undefined;
      });
    }))).filter(_.identity);

    // build the results
    if(matchedBranches.length === 0) {
      return [];
    } else if(matchedBranches.length === 1) {
      // we can reuse subgraph at the next level
      sg._idea.set(target_vertex_id, matchedBranches[0]);
      return [sg];
    } else {
      // we need to branch; create a new subgraph instance for each level
      return matchedBranches.map(function(idea) {
        let s = sg.copy();
        s._idea.set(target_vertex_id, idea);
        return s;
      });
    }
  })();
}
