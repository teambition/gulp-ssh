'use strict';

var gulp = require('gulp');
var GulpSSH = require('../index');
var gulpSequence = require('gulp-sequence');
var through = require('through2');

module.exports = function() {

  var gulpSSH = new GulpSSH({
    ignoreErrors: false,
    sshConfig: require('./test-settings')
  });

  gulp.task('exec', function() {
    return gulpSSH
      .exec(['uptime', 'ls -a', 'pwd'], {filePath: 'commands.log'})
      .pipe(gulp.dest('logs'));
  });

  gulp.task('sftp-read', function() {
    return gulpSSH.sftp('read', 'install.log')
      .pipe(gulp.dest('logs'));
  });

  gulp.task('sftp-write', function() {
    return gulp.src('index.js')
      .pipe(gulpSSH.sftp('write', 'test.js'));
  });

  gulp.task('shell', function() {
    return gulpSSH
      .shell(['cd /home/thunks', 'git pull', 'npm install', 'npm update', 'npm test'], {filePath: 'shell.log'})
      .pipe(gulp.dest('logs'));
  });

  gulp.task('test', gulpSequence('exec', 'sftp-read', 'sftp-write', 'shell'));

};
