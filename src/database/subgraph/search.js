'use strict';
const _ = require('lodash');
const bluebird = require('bluebird');
const subgraph = require('../subgraph');

// find a list of subgraphs in the database that matches the supplied subgraph
//
// use Prim's algorithm to expand the known subgraph
// we are trying to identify all of the vertices
// we use edges to find new ones
//
// Note: it's best if the subgraph is flat before running this
module.exports = function search(sg) {
  if(sg.concrete) return [sg];

  // sort high[0,1,...] to low[...,11,12]
  var edges = _.sortBy(sg.allEdges(), 'options.pref').reverse();

  return recursiveSearch(sg, edges);
};

function recursiveSearch(sg, edges) {
  // prune and validate edges that are finished
  edges = verifyEdges(sg, edges);
  if(!edges) return [];

  const selected = findEdgeToExpand(sg, edges);
  const nextSteps = (selected ? expandEdge(sg, selected) : []);

  // there isn't an edge to expand
  if(nextSteps.leading === 0) {
    // check all vertices to ensure they all have ideas defined
    if(sg._vertexCount !== sg._idea.size || edges.length)
      return [];

    sg.concrete = true;
    return [sg];
  } else {
    // do the next iteration of searches
    return nextSteps.reduce(function(ret, sg) {
      Array.prototype.push.apply(ret, recursiveSearch(sg, edges));
      return ret;
    }, []);
  }
}

Object.defineProperty(exports, 'units', { value: {} });
module.exports.units.findEdgeToExpand = findEdgeToExpand;
module.exports.units.updateSelected = updateSelected;
module.exports.units.getBranches = getBranches;
module.exports.units.verifyEdges = verifyEdges;
module.exports.units.verifyEdge = verifyEdge;
module.exports.units.expandEdge = expandEdge;

// find an edge what's partially on the graph, and partially off the graph
function findEdgeToExpand(sg, edges) {
  let selected;

  for(let edge of edges) {
    // since the edges are sorted by pref, we can exit early
    if(selected && edge.options.pref < selected.edge.options.pref)
      return selected;

    selected = updateSelected(sg, edge, selected);
  }

  return selected;
}

function updateSelected(sg, edge, selected) {
  // if we've already pick an edge with a higher pref, then we don't need to consider this edge
  if(selected && selected.edge.options.pref > edge.options.pref)
    return selected;

  const isSrc = sg.hasIdea(edge.src);
  const isDst = sg.hasIdea(edge.dst);
  // if they are both true or both false, then we shouldn't consider this edge
  // (side note: they shouldn't be in the list anymore if they are both true)
  // we only want to select this edge if one is specified and the other is not
  if(isSrc === isDst) return selected;

  // we can't consider this edge if the target object hasn't be identified
  // FIXME all the comments in expandEdge are referencing this! we need to keep following the pointer to see if this is an edge we CAN consider
  const match = sg.getMatch(isSrc?edge.dst:edge.src);
  if(match.options.pointer && sg.hasIdea(match.data))
    return selected;

  const currBranches = getBranches();

  if(!selected || selected.edge.options.pref < edge.options.pref || currBranches.length < selected.branches.length) {
    return {
      edge: edge,
      branches: currBranches,
      isForward: isSrc,
    };
  }

  return selected;
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

        (yield idea.link(link)).forEach(function(p) {
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
  if(!done.every(function(edge) { return verifyEdge(sg, edge); }))
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
        if((yield idea.link(link)).some(function(p) {
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

function expandEdge(sg, selected) {
  const target_vertex_id = (selected.isForward ? selected.edge.dst : selected.edge.src);
  let match = sg.getMatch(target_vertex_id);
  let matchData = match.data;

  // XXX what if the pointer vertex hasn't been resolved yet? should this be considered when choosing an edge to expand?
  // following the pointer requires a more complex pre match thing
  // if this points to a pointer, we need to follow that as well
  if(match.options.pointer) {
    // XXX stop early if there is data defined? will there ever be data defined?
    let m = sg.getMatch(matchData);
    while(m.options.pointer) {
      matchData = m.data;
      m = sg.getMatch(matchData);
    }
    matchData = sg.getData(matchData);
  }

  // filter all the branches that match
  var matchedBranches = selected.branches.filter(bluebird.coroutine(function*(idea) { // XXX I don't know if I can can pass bluebird.coroutine into the filter directly
    if(match.matcher === subgraph.matcher.id)
      return match.matcher(idea, matchData);
    else
      return match.matcher(yield idea.data(), matchData);
  }));

  // build the results
  if(matchedBranches.length === 0) {
    return [];
  } else if(matchedBranches.length === 1) {
    // we can reuse subgraph at the next level
    sg._idea.set(target_vertex_id, matchedBranches[0]);
    return [sg];
  } else {
    // we need to branch; create a new subgraph instance for each level
    return matchedBranches.map(function (idea) {
      var s = sg.copy();
      s._idea.set(target_vertex_id, idea);
      return s;
    });
  }
}
