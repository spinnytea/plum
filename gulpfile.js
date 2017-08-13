'use strict';
const _ = require('lodash');
const gulp = require('gulp');
const istanbul = require('gulp-istanbul');
const jshint = require('gulp-jshint');
const mocha = require('gulp-mocha');

// define which report we will use for the test
// 'nyan' is the best, so that is the default
// 'list' is definitely has it's merits
// 'json' and 'json-stream' are pretty neat
let reporter = 'nyan';
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
  const write_back = process.stdout.write;
  process.stdout.write = function() {
    if(arguments[0].indexOf('-') === 7)
      write_back.apply(process.stdout, arguments);
  };
}


const spec = ['test_setup.js', 'spec/**/*.js'];
const source = ['src/**/*.js'];
const unit = ['test_setup.js', 'unit/**/*.js'];
const tests = _.flatten([spec, unit]);
const files = _.flatten([source, tests]);

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

gulp.task('coverage', ['lint'], function (cb) {
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
gulp.task('testcd', [], function() {
  gulp.watch(files, ['coverage']);
  gulp.start('coverage');
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
gulp.task('unitcd', [], function() {
  gulp.watch(files, ['coverage-unit']);
  gulp.start('coverage-unit');
});
gulp.task('unitd', [], function() {
  gulp.watch(files, ['unit']);
  gulp.start('unit');
});
gulp.task('unitc', ['coverage-unit']);
