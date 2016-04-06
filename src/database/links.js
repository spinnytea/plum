'use strict';
// link ideas together
// these are the edges of the graph
// ideas take the lead role is storage, saving, and retrieval
const _ = require('lodash');


// after working with this for a while, links.list[name] is more consistent than links.list.name
// links.get(name) seems like the natural way to go
exports.get = (name => exports.units.list[name]);


Object.defineProperty(exports, 'units', { value: {} });
exports.units.list = {};
exports.units.create = create;

function create(name, options) {
  options = _.merge({
    transitive: false, // some search operations will follow transitive edges (e.g. a->b->c, a->? may find b, c)
    directed: true, // does the edge have a direction? is it a directed edge?
  }, options);
  const directed = !!options.directed;
  delete options.directed;

  let link = { name: name, opposite: undefined, isOpp: false, options: options };

  if(directed) {
    link.opposite = Object.freeze({ name: name + '-opp', opposite: link, isOpp: true, options: options });
  } else {
    link.opposite = link;
  }

  return (exports.units.list[name] = Object.freeze(link));
}


// no embedded structural meaning
// heavily used in testing
create('thought_description');

// no embedded structural meaning
// used in testing
// XXX remove when we have a standard link that is undirected
create('_test__undirected_', { directed: false });

// apple
//  macintosh --typeof_of-> apple
//  gala --typeof_of-> apple
create('type_of', { transitive: true });

// mark --typeof_of-> person
// mark --has-> apple
// person --can_has-> apple
//create('has');

// appleInstance
//  apple --property-> color
//  apple --property-> dimensions
create('property');

// helps identify when certain ideas are relevant
//  idea --context-> ContextIdea
create('context');
