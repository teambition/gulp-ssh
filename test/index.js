'use strict';

var gulp = require('gulp');
var GulpSSH = require('../index');
var gulpSequence = require('gulp-sequence');
var through = require('through2');

module.exports = function () {

  // Old version test
  // GulpSSH.exec({
  //   command: ['uptime', 'ls -a'],
  //   sshConfig: {
  //     host: 'angularjs.cn',
  //     port: 22,
  //     username: 'root',
  //     privateKey: require('fs').readFileSync('/Users/zensh/.ssh/id_rsa')
  //   },
  //   onEnd: function () {
  //     console.log('Test End!');
  //   }
  // });

  var gulpSSH = new GulpSSH({
    ignoreErrors: false,
    sshConfig: {
      host: 'angularjs.cn',
      port: 22,
      username: 'root',
      privateKey: require('fs').readFileSync('/Users/zensh/.ssh/id_rsa')
    }
  });

  gulp.task('exec', function () {
    return gulpSSH
      .exec(['uptime', 'ls -a', 'pwd'], {filePath: 'commands.log'})
      .pipe(gulp.dest('logs'));
  });

  gulp.task('sftp-read', function () {
    return gulpSSH.sftp('read', 'pm2.json')
      .pipe(gulp.dest('logs'));
  });

  gulp.task('sftp-write', function () {
    return gulp.src('../logs/commands.log')
      .pipe(gulpSSH.sftp('write', 'test.js'));
  });

  gulp.task('shell', function () {
    return gulpSSH
      .shell(['cd /home/thunks', 'git pull', 'npm install', 'npm update', 'npm test'], {filePath: 'shell.log'})
      .pipe(gulp.dest('logs'));
  });

  gulp.task('test', gulpSequence('exec', 'sftp-read', 'sftp-write', 'shell'));

};
