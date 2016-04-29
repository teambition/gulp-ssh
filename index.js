'use strict'
/*
 * gulp-ssh
 * https://github.com/teambition/gulp-ssh
 *
 * Copyright (c) 2014 Yan Qing
 * Licensed under the MIT license.
 */

var path = require('path')
var util = require('util')
var EventEmitter = require('events').EventEmitter

var gulp = require('gulp')
var gutil = require('gulp-util')
var through = require('through2')
var Client = require('ssh2').Client
var packageName = require('./package.json').name

module.exports = GulpSSH

function GulpSSH (options) {
  if (!(this instanceof GulpSSH)) return new GulpSSH(options)
  var ctx = this

  this.options = options || {}
  this._connecting = false
  this._connected = false
  this._ended = false
  this._readyEvents = []

  this.ssh2 = new Client()
  this.ssh2
    .on('connect', function () {
      gutil.log(packageName + ' :: Connect...')
      ctx.emit('connect')
    })
    .on('ready', function () {
      gutil.log(packageName + ' :: Ready')
      ctx._connecting = false
      ctx._connected = true
      flushReady(ctx)
      ctx.emit('ready')
    })
    .on('error', function (err) {
      gutil.colors.red(new gutil.PluginError(packageName, err))
      ctx.emit('error', err)
    })
    .on('end', function () {
      gutil.log(packageName + ' :: End')
      ctx._connecting = false
      ctx._connected = false
      ctx.emit('end')
    })
    .on('close', function (hadError) {
      gutil.log(packageName + ' :: Close')
      ctx._connecting = false
      ctx._connected = false
      ctx.emit('close', hadError)
    })

  EventEmitter.call(this)
  gulp.once('stop', function () {
    ctx.close()
  })
}

util.inherits(GulpSSH, EventEmitter)

function flushReady (ctx) {
  if (!ctx._connected) return
  while (ctx._readyEvents.length) ctx._readyEvents.shift().call(ctx)
}

GulpSSH.prototype.connect = function (options) {
  if (options) this.options.sshConfig = options
  if (!this._connecting && !this._connected) {
    this._connecting = true
    this.ssh2.connect(this.options.sshConfig)
  }
  return this
}

GulpSSH.prototype.ready = function (fn) {
  this._readyEvents.push(fn)
  flushReady(this)
}

GulpSSH.prototype.close = function () {
  if (this.ended) return
  this._connecting = false
  this._connected = false
  this._ended = true
  this._readyEvents.length = 0
  this.ssh2.end()
}

GulpSSH.prototype.exec = function (commands, options) {
  var ctx = this
  var ssh = this.ssh2
  var chunkSize = 0
  var chunks = []
  var outStream = through.obj()

  if (!commands) throw new gutil.PluginError(packageName, '`commands` required.')

  options = options || {}
  commands = Array.isArray(commands) ? commands.slice() : [commands]

  this.connect().ready(execCommand)

  function endStream () {
    outStream.push(new gutil.File({
      cwd: __dirname,
      base: __dirname,
      path: path.join(__dirname, options.filePath || 'gulp-ssh.exec.log'),
      contents: Buffer.concat(chunks, chunkSize)
    }))
    outStream.end()
    ctx.close()
  }

  function execCommand () {
    if (!commands.length) return endStream()
    var command = commands.shift()
    if (typeof command !== 'string') return execCommand()

    gutil.log(packageName + ' :: Executing :: ' + command)
    ssh.exec(command, options, function (err, stream) {
      if (err) return outStream.emit('error', new gutil.PluginError(packageName, err))
      stream
        .on('data', function (chunk) {
          chunkSize += chunk.length
          chunks.push(chunk)
          outStream.emit('ssh2Data', chunk)
        })
        .on('exit', function (code, signalName, didCoreDump, description) {
          if (ctx.ignoreErrors === false && code == null) {
            var message = signalName + ', ' + didCoreDump + ', ' + description
            outStream.emit('error', new gutil.PluginError(packageName, message))
          }
        })
        .on('close', execCommand)
        .stderr.on('data', function (data) {
          outStream.emit('error', new gutil.PluginError(packageName, data + ''))
        })
    })
  }

  return outStream
}

GulpSSH.prototype.sftp = function (command, filePath, options) {
  var ctx = this
  var ssh = this.ssh2
  var outStream
  options = options || {}
  if (!command) throw new gutil.PluginError(packageName, '`command` required.')
  if (!filePath) throw new gutil.PluginError(packageName, '`filePath` required.')

  this.connect()

  if (command === 'write') {
    outStream = through.obj(function (file, encoding, callback) {
      ctx.ready(function () {
        ssh.sftp(function (err, sftp) {
          if (err) return callback(new gutil.PluginError(packageName, err))
          options.autoClose = true
          var write = sftp.createWriteStream(filePath, options)

          write
            .on('error', function (error) {
              err = error
            })
            .on('finish', function () {
              sftp.end()
              if (err) callback(err)
              else callback(null, file)
            })

          if (file.isStream()) file.pipe(write)
          else if (file.isBuffer()) write.end(file.contents); else {
            err = new gutil.PluginError(packageName, 'file error!')
            write.end()
          }
        })
      })
    })
  } else if (command === 'read') {
    var chunkSize = 0
    var chunks = []

    outStream = through.obj()
    ctx.ready(function () {
      ssh.sftp(function (err, sftp) {
        if (err) return outStream.emit('error', new gutil.PluginError(packageName, err))
        var read = sftp.createReadStream(filePath, options)
        options.base = options.base || ''

        read
          .on('data', function (chunk) {
            chunkSize += chunk.length
            chunks.push(chunk)
          })
          .on('error', function (err) {
            outStream.emit('error', err)
          })
          .on('end', function () {
            outStream.push(new gutil.File({
              cwd: __dirname,
              base: __dirname,
              path: path.join(__dirname, options.filePath || filePath),
              contents: Buffer.concat(chunks, chunkSize)
            }))
            outStream.end()
            this.close()
          })
          .on('close', function () {
            sftp.end()
          })
      })
    })
  } else throw new gutil.PluginError(packageName, 'Command "' + command + '" not support.')

  return outStream
}

// Acts similarly to Gulp dest, will make dirs if not exist and copy the files
// to the glob path
GulpSSH.prototype.dest = function (destDir, options) {
  if (!destDir) throw new gutil.PluginError(packageName, '`destDir` required.')

  var ctx = this
  var ssh = this.ssh2
  var sftpClient = null
  options = options || {}
  options.autoClose = false

  function getSftp (callback) {
    if (sftpClient) return callback(null, sftpClient)
    ctx.connect().ready(function () {
      ssh.sftp(function (err, sftp) {
        if (err) return callback(err)
        sftpClient = sftp
        callback(null, sftp)
      })
    })
  }

  function end (err, callback) {
    if (sftpClient) {
      sftpClient.end()
      sftpClient = null
    }
    if (err) err = new gutil.PluginError(packageName, err)
    callback(err)
  }

  return through.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      gutil.log('"' + gutil.colors.cyan(file.path) + '" has no content. Skipping.')
      return callback()
    }
    getSftp(function (err, sftp) {
      if (err) return end(err, callback)
      var baseRegexp = new RegExp('^' + file.base.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'))
      var outPath = path.join(destDir, file.path.replace(baseRegexp, '')).replace(/\\/g, '/')
      gutil.log('Preparing to write "' + gutil.colors.cyan(outPath) + '"')

      internalMkDirs(sftp, outPath, function (err) {
        if (err) return end(err, callback)
        gutil.log('Writing \'' + gutil.colors.cyan(outPath) + '\'')

        file.pipe(sftp.createWriteStream(outPath, options))
          .on('error', done)
          .on('finish', done)

        function done (err) {
          if (err) return end(err, callback)
          gutil.log('Finished writing \'' + gutil.colors.cyan(outPath) + '\'')
          callback()
        }
      })
    })
  }, function (callback) {
    end(null, callback)
  })
}

GulpSSH.prototype.shell = function (commands, options) {
  var ssh = this.ssh2
  var chunkSize = 0
  var chunks = []
  var outStream = through.obj()

  if (!commands) throw new gutil.PluginError(packageName, '`commands` required.')

  options = options || {}
  commands = Array.isArray(commands) ? commands.slice() : [commands]

  function endStream () {
    outStream.push(new gutil.File({
      cwd: __dirname,
      base: __dirname,
      path: path.join(__dirname, options.filePath || 'gulp-ssh.exec.log'),
      contents: Buffer.concat(chunks, chunkSize)
    }))
    outStream.end()
  }

  this.connect().ready(function () {
    if (commands.length === 0) return endStream()
    ssh.shell(function (err, stream) {
      if (err) return outStream.emit('error', new gutil.PluginError(packageName, err))

      stream
        .on('data', function (chunk) {
          chunkSize += chunk.length
          chunks.push(chunk)
          outStream.emit('ssh2Data', chunk)
        })
        .on('close', endStream)
        .stderr.on('data', function (data) {
          outStream.emit('error', new gutil.PluginError(packageName, data + ''))
        })

      var lastCommand
      commands.forEach(function (command) {
        if (command[command.length - 1] !== '\n') command += '\n'
        gutil.log(packageName + ' :: shell :: ' + command)
        stream.write(command)
        lastCommand = command
      })
      if (options.autoExit !== false) stream.end(lastCommand === 'exit\n' ? null : 'exit\n')
    })
  })

  return outStream
}

function internalMkDirs (sftp, filePath, callback) {
  var outPathDir = path.dirname(filePath).replace(/\\/g, '/')

  sftp.exists(outPathDir, function (result) {
    if (result) return callback()
    // recursively make parent directories as required
    internalMkDirs(sftp, outPathDir, function (err) {
      if (err) return callback(err)
      gutil.log('Creating directory \'' + gutil.colors.cyan(outPathDir) + '\'')
      sftp.mkdir(outPathDir, callback)
    })
  })
}
