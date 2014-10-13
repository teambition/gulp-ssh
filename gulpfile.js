'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var test = require('./test/index');
var gulpSequence = require('gulp-sequence');

gulp.task('jshint', function(callback) {
  var s = gulp.src(['lib/*.js', '*.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
  return callback(null);
});

test();

gulp.task('default', gulpSequence('jshint', 'test'));
