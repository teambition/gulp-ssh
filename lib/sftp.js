'use strict';
/*
 * gulp-ssh
 * https://github.com/teambition/gulp-ssh
 *
 * Copyright (c) 2013 Yan Qing
 * Licensed under the MIT license.
 */

var path = require('path');
var es = require('event-stream');
var gutil = require('gulp-util');
var ssh2 = require('ssh2');

module.exports = function (options) {
  if (typeof options.sshConfig !== 'object') {
    throw new Error('`sshConfig` required.');
  }
  // TODO
};
