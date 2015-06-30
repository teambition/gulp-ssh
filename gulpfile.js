'use strict'

var gulp = require('gulp')
var test = require('./test/index')
var gulpSequence = require('gulp-sequence')

test()

gulp.task('default', gulpSequence('test'))
