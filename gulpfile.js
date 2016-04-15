'use strict';
var _ = require('lodash');
var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var rm = require('gulp-rm');

// define which report we will use for the test
// 'nyan' is the best, so that is the default
// 'list' is definitely has it's merits
// 'json' and 'json-stream' are pretty neat
var reporter = 'nyan';
process.argv.forEach(function(val, idx, array) {
  if(val === '-r' && array[idx+1])
    reporter = array[idx+1];
});

// print out all the tests that have been skipped
if(reporter === 'skipped') {
  reporter = 'list';

  // hacks!
  // inline gulp
  // mocha report: list uses '-' to bullet skipped tests
  // we are going to grep the output to only include those tests
  var write_back = process.stdout.write;
  process.stdout.write = function() {
    if(arguments[0].indexOf('-') === 7)
      write_back.apply(process.stdout, arguments);
  };
}


var spec = ['spec/**/*.js'];
var source = ['src/**/*.js'];
var unit = ['unit/**/*.js'];
var tests = _.flatten([spec, unit]);
var files = _.flatten([source, tests]);

gulp.task('lint', [], function () {
  return gulp.src(files).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('spec', ['lint'], function() {
  return gulp.src(spec, {read: false})
    .pipe(mocha({reporter: reporter}));
});
gulp.task('unit', ['lint'], function() {
  return gulp.src(unit, {read: false})
    .pipe(mocha({reporter: reporter}));
});
gulp.task('test', ['lint'], function() {
  return gulp.src(tests, {read: false})
    .pipe(mocha({reporter: reporter}));
});

gulp.task('coverage', [], function (cb) {
  gulp.src(source)
    .pipe(istanbul({ includeUntested: true })) // Covering files
    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
    .on('finish', function () {
      return gulp.src(tests, { read: false })
        .pipe(mocha({reporter: 'list'}))
        .pipe(istanbul.writeReports({reporters: ['html']}))
        .on('end', cb);
    });
});

//

gulp.task('testd', [], function() {
  gulp.watch(files, ['test']);
  gulp.start('test');
});

gulp.task('coverage-unit', ['lint'], function (cb) {
  gulp.src(source)
    .pipe(istanbul({ includeUntested: true })) // Covering files
    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
    .on('finish', function () {
      return gulp.src(unit, { read: false })
        .pipe(mocha({reporter: 'nyan'}))
        .on('error', function() { /* gutil.log(arguments); */ this.emit('end'); })
        .pipe(istanbul.writeReports({reporters: ['html']}))
        .on('end', cb);
    });
});
gulp.task('unitd', [], function() {
  gulp.watch(files, ['coverage-unit']);
  gulp.start('coverage-unit');
});
