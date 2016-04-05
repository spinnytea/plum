'use strict';
// link ideas together
// these are the edges of the graph
// ideas take the lead role is storage, saving, and retrieval
const _ = require('lodash');

exports.get = function(name) { return exports.units.list[name]; };

Object.defineProperty(exports, 'units', { value: {} });
exports.units.list = {};
exports.units.create = create;

function create(name, options) {
  options = _.merge({
    transitive: false // XXX add a description
  }, options);

  var link = { name: name, opposite: undefined, isOpp: false };
  exports.units.list[name] = link;

  if(!options.undirected) {
    link.opposite = { name: name + '-opp', opposite: link, isOpp: true };
  } else {
    link.opposite = link;
  }
  delete options.undirected;

  return link;
}


// no embedded structural meaning
// heavily used in testing
create('thought_description');

// no embedded structural meaning
// used in testing
// XXX remove when we have a standard link that is undirected
create('_test__undirected_', { undirected: true });

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
