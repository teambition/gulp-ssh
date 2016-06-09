'use strict'

var gulp = require('gulp')
var GulpSSH = require('../index')
var gulpSequence = require('gulp-sequence')
var fs = require('fs')

module.exports = function () {
  var config = {}

  try {
    config = {
      host: '192.168.0.21',
      port: 22,
      username: 'iojs',
      privateKey: fs.readFileSync('/Users/zensh/.ssh/id_rsa')
    }
  } catch (e) {}  // swallow the exception if the file doesn't exist, we'll just use the default settings

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

  gulp.task('dest', function () {
    return gulp
      .src('node_modules/ssh2/**/*')
      .pipe(gulpSSH.dest('/home/iojs/test/ssh2/'))
  })

  gulp.task('sftp-read', function () {
    return gulpSSH.sftp('read', '/home/iojs/test/ssh2/package.json', {filePath: 'ssh2-package.json'})
      .pipe(gulp.dest('logs'))
  })

  gulp.task('sftp-write', function () {
    return gulp.src('test/index.js')
      .pipe(gulpSSH.sftp('write', '/home/iojs/test/gulp-ssh-test.js'))
  })

  gulp.task('shell', function () {
    return gulpSSH
      .shell([
        'cd /home/iojs/test',
        'rm -rf thunks',
        'git clone https://github.com/thunks/thunks.git',
        'cd thunks',
        'npm install',
        'npm test'
      ], {filePath: 'shell.log'})
      .pipe(gulp.dest('logs'))
  })

  gulp.task('test', gulpSequence('exec', 'dest', 'sftp-read', 'sftp-write', 'shell'))
}
