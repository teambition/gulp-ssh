'use strict'

var gulp = require('gulp')
var GulpSSH = require('../index')
var gulpSequence = require('gulp-sequence')
var fs = require('fs')

module.exports = function () {

  var config = {}

  try {
    config = {
      host: '192.168.0.22',
      port: 22,
      username: 'root',
      privateKey: fs.readFileSync('/Users/zensh/.ssh/id_rsa')
    }
  } catch(e) {}  // swallow the exception if the file doesn't exist, we'll just use the default settings

  try {
    config = require('./test-settings')
  } catch (e) {} // swallow the exception if the file doesn't exist, we'll just use the default settings

  var gulpSSH = new GulpSSH({
    ignoreErrors: false,
    sshConfig: config
  })

  gulp.task('exec', function () {
    return gulpSSH
      .exec(['uptime', 'ls -a', 'pwd'], {filePath: 'commands.log'})
      .pipe(gulp.dest('logs'))
  })

  gulp.task('sftp-read', function () {
    return gulpSSH.sftp('read', 'install.log')
      .pipe(gulp.dest('logs'))
  })

  gulp.task('sftp-write', function () {
    return gulp.src('index.js')
      .pipe(gulpSSH.sftp('write', 'test.js'))
  })

  gulp.task('shell', function () {
    return gulpSSH
      .shell(['cd /home/thunks', 'git pull', 'npm install', 'npm update', 'npm test'], {filePath: 'shell.log'})
      .pipe(gulp.dest('logs'))
  })

  gulp.task('dest', function () {
    return gulp
      .src(['./**/*.js', '!**/node_modules/**'])
      .pipe(gulpSSH.dest('/home/vm/test'))
  })

  gulp.task('test', gulpSequence('exec', 'sftp-read', 'sftp-write', 'shell', 'dest'))
}
