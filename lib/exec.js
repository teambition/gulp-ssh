'use strict';
/*
 * gulp-ssh
 * https://github.com/teambition/gulp-ssh
 *
 * Copyright (c) 2013 Yan Qing
 * Licensed under the MIT license.
 */

var gutil = require('gulp-util');
var Connection = require('ssh2');

module.exports = function (options) {
  if (typeof options.sshConfig !== 'object') {
    throw new gutil.PluginError('gulp-ssh', '`sshConfig` required.');
  }
  if (!options.command) {
    throw new gutil.PluginError('gulp-ssh', '`command` required.');
  }

  var commands = Array.isArray(options.command) ? options.command : [options.command];
  var ssh = new Connection();
  var execOptions = options.execOptions || {};

  function execCommand() {
    if (commands.length === 0) {
      ssh.end();
    } else {
      var command = commands.shift();
      if (typeof command !== 'string') {
        execCommand();
      } else {
        gutil.log('SSH :: Executing :: ' + command);
        ssh.exec(command, execOptions, function (err, stream) {
          if (err) {
            throw new gutil.PluginError('gulp-ssh', err);
          }
          stream.on('data', function (data, extended) {
            var out = '\n' + data.toString();
            if (extended === 'stderr') {
              gutil.log(gutil.colors.red(out));
            } else {
              gutil.log(out);
            }
          });
          stream.on('end', function () {
            gutil.log('SSH :: ' + command + ' :: end');
          });
          stream.on('close', function () {
            gutil.log('SSH :: ' + command + ' :: close');
            execCommand();
          });
          stream.on('exit', function (code, signal) {
            if (options.ignoreErrors === false && code !== 0) {
              gutil.log('SSH :: Error executing: ' + command);
              ssh.end();
            }
          });
        });
      }
    }
  }

  ssh.on('connect', function () {
    gutil.log('SSH :: connect...');
  });
  ssh.on('ready', function () {
    gutil.log('SSH :: ready');
    execCommand();
  });
  ssh.on('banner', function (message) {
    gutil.log('SSH :: banner:', message);
  });
  ssh.on('error', function (err) {
    gutil.log('SSH :: error :: ', gutil.colors.red(new gutil.PluginError('gulp-ssh', err)));
  });
  ssh.on('end', function () {
    gutil.log('SSH :: end');
    if (options.onEnd) {
      options.onEnd();
    }
  });
  ssh.on('close', function () {
    gutil.log('SSH :: close');
  });
  ssh.connect(options.sshConfig);

};
