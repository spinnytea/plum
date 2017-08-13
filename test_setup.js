'use strict';
// initialize the app before we start testing
const config = require('./src/config');

before(function() {
  config.init();
});
after(function() {
  config.save();
});
