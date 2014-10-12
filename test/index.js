'use strict';

var gulp = require('gulp');
var through = require('through2');
var GulpSSH = require('../index');

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
    .exec(['uptime', 'ls -a', 'pwd'])
    .pipe(through(function (file, encoding, cb) {
      console.log('through:', encoding, file.toString());
      cb(null, file);
    }));
});

gulp.task('sftp-read', function () {
  return gulpSSH.sftp('read', 'pm2.json')
    .pipe(gulp.dest('test.json'));
});

gulp.task('sftp-write', function () {
  return gulp.src('index.js')
    .pipe(gulpSSH.sftp('write', 'test.js'));
});

gulp.task('default', ['sftp-read']);
