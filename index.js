// 'use strict';
//
// module.exports = {
//   exec: require('./lib/exec'),
//   sftp: require('./lib/sftp')
// };

'use strict';
/*
 * gulp-ssh
 * https://github.com/teambition/gulp-ssh
 *
 * Copyright (c) 2013 Yan Qing
 * Licensed under the MIT license.
 */

var path = require('path');
var gutil = require('gulp-util');
var ssh2 = require('ssh2');
var through = require('through2');
var processPath = path.dirname(process.argv[1]);

module.exports = GulpSSH;

function GulpSSH(options) {
  if (!(this instanceof GulpSSH)) return new GulpSSH(options);
  var ctx = this;

  this.options = options || {};
  this._connect = false;
  this._connected = false;
  this._readyEvents = [];

  this.ssh2 = new ssh2();
  this.ssh2
    .on('connect', function () {
      gutil.log('Gulp-SSH :: Connect...');
    })
    .on('ready', function () {
      gutil.log('Gulp-SSH :: Ready');
      this._connect = false;
      ctx._connected = true;
      flushReady(ctx);
    })
    .on('error', function (err) {
      gutil.log(err);
      gutil.colors.red(new gutil.PluginError('gulp-ssh', err));
    })
    .on('end', function () {
      gutil.log('Gulp-SSH :: End');
    })
    .on('close', function () {
      gutil.log('Gulp-SSH :: Close');
      ctx._connect = false;
      ctx._connected = false;
    });
}

function flushReady(ctx) {
  if (!ctx._connected) return;
  var listener = ctx._readyEvents.shift();
  while (listener) {
    listener.call(ctx);
    listener = ctx._readyEvents.shift();
  }
}

GulpSSH.prototype.connect = function (options) {
  var ctx = this;
  if (options) this.options.sshConfig = options;
  if (!this._connect && !ctx._connected) {
    this._connect = true;
    this.ssh2.connect(this.options.sshConfig);
  }
  return this;
};

GulpSSH.prototype.ready = function (fn) {
  this._readyEvents.push(fn);
  flushReady(this);
};

GulpSSH.prototype.exec = function (commands, options) {
  var ctx = this, outStream = through.obj(), ssh = this.ssh2;

  if (!commands) throw new gutil.PluginError('gulp-ssh', '`commands` required.');

  commands = Array.isArray(commands) ? commands : [commands];

  function endSSH() {
    ssh.end();
    outStream.end();
  }

  function execCommand() {
    if (commands.length === 0) return endSSH();
    var command = commands.shift();
    if (typeof command !== 'string') return execCommand();

    gutil.log('Gulp-SSH :: Executing :: ' + command);

    ssh.exec(command, options, function (err, stream) {
      if (err) throw new gutil.PluginError('gulp-ssh', err);

      stream
        .on('exit', function (code, signalName, didCoreDump, description) {
          if (ctx.ignoreErrors === false && code == null) {
            var message = signalName + ', ' + didCoreDump + ', ' + description;
            outStream.emit('error', new gutil.PluginError('gulp-ssh', message));
          }
        })
        .on('data', function (data, extended) {
          outStream.emit('data:' + command, data, extended);
        })
        .on('end', function () {
          execCommand();
        })
        .stderr.on('data', function (data) {
          outStream.emit('error', new gutil.PluginError('gulp-ssh', data + ''));
        });

        stream.pipe(outStream, {end: false});
    });
  }

  this.connect().ready(execCommand);

  return outStream;

};

GulpSSH.prototype.sftp = function (command, filePath, options) {
  var ctx = this, ssh = this.ssh2, outStream;

  if (!command) throw new gutil.PluginError('gulp-ssh', '`command` required.');
  if (!filePath) throw new gutil.PluginError('gulp-ssh', '`filePath` required.');

  this.connect();

  function endSSH() {
    ssh.end();
    outStream.end();
  }

  if (command === 'write') {
    outStream = through.obj(function (file, encoding, callback) {
      ctx.ready(function () {
        ssh.sftp(function(err, sftp) {
          if (err) throw new gutil.PluginError('gulp-ssh', err);
          var write = sftp.createWriteStream(filePath, options);

          write.on('finish', endSSH);
          file.pipe(write);
          callback(null, file);
        });
      });
    });
  } else if (command === 'read') {
    var file = new gutil.File({
      cwd: __dirname,
      base: __dirname,
      path: path.join(__dirname, filePath)
    });
    outStream = through.obj();
    ctx.ready(function () {
      ssh.sftp(function(err, sftp) {
        if (err) throw new gutil.PluginError('gulp-ssh', err);
        file.contents = sftp.createReadStream(filePath, options);
        file.pipe(outStream);
        file.contents.on('end', endSSH);
      });
    });
  }

  return outStream;

};

// 兼容 老版本
GulpSSH.exec = function (options) {
  if (typeof options.sshConfig !== 'object') {
    throw new gutil.PluginError('gulp-ssh', '`sshConfig` required.');
  }
  if (!options.command) {
    throw new gutil.PluginError('gulp-ssh', '`command` required.');
  }

  var execOptions = options.execOptions || {};
  var callback = options.onEnd || function () {};
  var ssh = new GulpSSH({sshConfig: options.sshConfig});

  ssh.exec(options.command, execOptions).on('end', callback);
};
