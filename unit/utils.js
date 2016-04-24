'use strict';
const expect = require('chai').expect;
const utils = require('../src/utils');

describe('utils', function() {
  it('isEmpty', function() {
    const isEmpty = utils.isEmpty;

    expect(isEmpty({})).to.equal(true);
    expect(isEmpty([])).to.equal(true);
    expect(isEmpty({a:1})).to.equal(false);
    expect(isEmpty([1])).to.equal(false);
  });
}); // end utils