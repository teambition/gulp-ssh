'use strict'

var gulp = require('gulp')
var samples = require('./test/samples')
var gulpSequence = require('gulp-sequence')

samples()

gulp.task('default', gulpSequence('samples'))
