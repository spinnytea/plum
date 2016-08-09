'use strict';
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
  if(sg.concrete)
    return [sg];
  
  const selected = findEdgeToExpand(sg);
  
  // there are errors in the matching
  if(!selected.isValid) return [];

  const nextSteps = expandEdge(sg, selected);

  // there isn't an edge to expand
  if(nextSteps.leading === 0) {
    // check all vertices to ensure they all have ideas defined
    if(sg._vertexCount !== sg._idea.size)
      return [];

    sg.concrete = true;
    return [sg];
  } else {
    // do the next iteration of searches
    return nextSteps.reduce(function(ret, sg) {
      Array.prototype.push.apply(ret, search(sg));
      return ret;
    }, []);
  }
};

Object.defineProperty(exports, 'units', { value: {} });
module.exports.units.findEdgeToExpand = findEdgeToExpand;
module.exports.units.updateSelected = updateSelected;
module.exports.units.getBranches = getBranches;
module.exports.units.verifyEdge = verifyEdge;
module.exports.units.expandEdge = expandEdge;

// find an edge what's partially on the graph, and partially off the graph
function findEdgeToExpand(sg) {
  const selected = {
    edge: undefined, // edge; which one we are going to expand
    branches: undefined, // array; the vertices it points to
    isForward: undefined, // true: src is defined, dst is not; false: dst is defined, src is not
    isValid: true
  };

  // FIXME we can do better than looping over every edge every time
  // - e.g. sort by priority and stop looping when we get to a lower priority
  // -      and remove the edges from the list once we are done with them (that 3x down below)
  selected.isValid = sg.allEdges().every(function(currEdge) {
    const isSrc = sg.hasIdea(currEdge.src);
    const isDst = sg.hasIdea(currEdge.dst);

    if(isSrc ^ isDst) {
      updateSelected(sg, currEdge, selected, isSrc);
    } else if(isSrc && isDst) {
      // XXX do we need to verify the edge every time? like, this is sg.allEdges, ALL EDGES - this is one major reason why subgraph matching is slow
      return verifyEdge(sg, currEdge);
    }
    // if neither src nor dst, then we can't expand the current graph

    return true;
  });

  return selected;
}

function updateSelected(sg, currEdge, selected, isForward) {
  // if we've already pick an edge with a higher pref, then we don't need to consider this edge
  if(selected.edge && selected.edge.options.pref > currEdge.options.pref)
    return;

  // we can't consider this edge if the target object hasn't be identified
  const match = sg.getMatch(isForward?currEdge.dst:currEdge.src);
  if(match.options.pointer && sg.hasIdea(match.data))
    return;

  const currBranches = getBranches();

  if(!selected.edge || selected.edge.options.pref < currEdge.options.pref || currBranches.length < selected.branches.length) {
    selected.edge = currEdge;
    selected.branches = currBranches;
    selected.isForward = isForward;
  }
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
  const nextSteps = [];

  // XXX remove this if statement, it's spaghetti code; if we don't need to exapand an edge, then we shouldn't get here
  if(selected.edge && selected.branches) {
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
      // noop
    } else if(matchedBranches.length === 1) {
      // we can reuse subgraph at the next level
      sg._idea.set(target_vertex_id, matchedBranches[0]);
      nextSteps.push(sg);
    } else {
      // we need to branch; create a new subgraph instance for each level
      matchedBranches.forEach(function(idea) {
        var s = sg.copy();
        s._idea.set(target_vertex_id, idea);
        nextSteps.push(s);
      });
    }
  }

  return nextSteps;
}
