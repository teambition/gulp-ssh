'use strict'
/*
 * gulp-ssh
 * https://github.com/teambition/gulp-ssh
 *
 * Licensed under the MIT license.
 */

const colors = require('ansicolors')
const log = require('fancy-log')
const path = require('path')
const util = require('util')
const EventEmitter = require('events').EventEmitter
const File = require('vinyl')
const PluginError = require('plugin-error')

const through = require('through2')
const Client = require('ssh2').Client
const packageName = require('./package.json').name

module.exports = GulpSSH

Client.prototype.gulpId = null
Client.prototype.gulpQueue = null
Client.prototype.gulpConnected = false
Client.prototype.gulpFlushReady = function () {
  this.gulpConnected = true
  while (this.gulpQueue.length) this.gulpQueue.shift().call(this)
}
Client.prototype.gulpReady = function (cb) {
  if (this.gulpConnected) cb.call(this)
  else this.gulpQueue.push(cb)
}

function GulpSSH (options) {
  if (!(this instanceof GulpSSH)) return new GulpSSH(options)
  if (!options || !options.sshConfig) throw new Error('options.sshConfig required!')
  this.options = options
  this.connections = Object.create(null)
  EventEmitter.call(this)
}

util.inherits(GulpSSH, EventEmitter)

var gulpId = 0
GulpSSH.prototype.getClient = function () {
  var ctx = this
  var ssh = new Client()
  ssh.gulpId = gulpId++
  ssh.gulpQueue = []
  ssh.gulpConnected = false
  this.connections[ssh.gulpId] = ssh

  ssh
    .on('error', function (err) {
      ctx.emit('error', new PluginError(packageName, err))
    })
    .on('end', function () {
      delete ctx.connections[this.gulpId]
    })
    .on('close', function () {
      delete ctx.connections[this.gulpId]
    })
    .on('ready', ssh.gulpFlushReady)
    .connect(this.options.sshConfig)
  return ssh
}

GulpSSH.prototype.close = function () {
  var connections = this.connections
  Object.keys(connections).forEach(function (id) {
    connections[id].end()
    delete connections[id]
  })
}

GulpSSH.prototype.exec = function (commands, options) {
  var ctx = this
  var ssh = this.getClient()
  var chunkSize = 0
  var chunks = []
  var outStream = through.obj()

  if (!commands) throw new PluginError(packageName, '`commands` required.')

  options = options || {}
  commands = Array.isArray(commands) ? commands.slice() : [commands]

  ssh.gulpReady(execCommand)

  function endStream () {
    outStream.push(new File({
      cwd: __dirname,
      base: __dirname,
      path: path.join(__dirname, options.filePath || 'gulp-ssh.exec.log'),
      contents: Buffer.concat(chunks, chunkSize)
    }))

    ssh.end()
    outStream.end()
  }

  function execCommand () {
    if (!commands.length) return endStream()
    var command = commands.shift()
    if (typeof command !== 'string') return execCommand()

    log(packageName + ' :: Executing :: ' + command)
    ssh.exec(command, options, function (err, stream) {
      if (err) return outStream.emit('error', new PluginError(packageName, err))
      stream
        .on('data', function (chunk) {
          chunkSize += chunk.length
          chunks.push(chunk)
          outStream.emit('ssh2Data', chunk)
        })
        .on('exit', function (code, signalName, didCoreDump, description) {
          if (ctx.ignoreErrors === false && code == null) {
            var message = signalName + ', ' + didCoreDump + ', ' + description
            outStream.emit('error', new PluginError(packageName, message))
          }
        })
        .on('close', execCommand)
        .stderr.on('data', function (data) {
          outStream.emit('error', new PluginError(packageName, data + ''))
        })
    })
  }

  return outStream
}

GulpSSH.prototype.sftp = function (command, filePath, options) {
  var outStream
  var ssh = this.getClient()
  options = options || {}
  if (!command) throw new PluginError(packageName, '`command` required.')
  if (!filePath) throw new PluginError(packageName, '`filePath` required.')

  if (command === 'write') {
    outStream = through.obj(function (file, encoding, callback) {
      ssh.gulpReady(function () {
        ssh.sftp(function (err, sftp) {
          if (err) return callback(new PluginError(packageName, err))
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

          if (file.isStream()) file.contents.pipe(write)
          else if (file.isBuffer()) write.end(file.contents)
          else {
            err = new PluginError(packageName, 'file error!')
            write.end()
          }
        })
      })
    }, function (callback) {
      ssh.end()
      callback()
    })
  } else if (command === 'read') {
    var chunkSize = 0
    var chunks = []

    outStream = through.obj()
    ssh.gulpReady(function () {
      ssh.sftp(function (err, sftp) {
        if (err) return outStream.emit('error', new PluginError(packageName, err))
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
            outStream.push(new File({
              cwd: __dirname,
              base: __dirname,
              path: path.join(__dirname, options.filePath || filePath),
              contents: Buffer.concat(chunks, chunkSize)
            }))
            this.close()
          })
          .on('close', function () {
            sftp.end()
            ssh.end()
            outStream.end()
          })
      })
    })
  } else throw new PluginError(packageName, 'Command "' + command + '" not supported.')

  return outStream
}

// Acts similarly to Gulp dest, will make dirs if not exist and copy the files
// to the glob path
GulpSSH.prototype.dest = function (destDir, options) {
  if (!destDir) throw new PluginError(packageName, '`destDir` required.')

  var sftpClient = null
  var ssh = this.getClient()
  options = options || {}
  options.autoClose = false

  function getSftp (callback) {
    if (sftpClient) return callback(null, sftpClient)
    ssh.gulpReady(function () {
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
    ssh.end()
    if (err) err = new PluginError(packageName, err)
    callback(err)
  }

  return through.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      log('"' + colors.cyan(file.path) + '" has no content. Skipping.')
      return callback()
    }
    getSftp(function (err, sftp) {
      if (err) return end(err, callback)
      var outPath = path.join(destDir, file.relative)
      if (path.sep === '\\') outPath = outPath.replace(/\\/g, '/')
      log('Preparing to write "' + colors.cyan(outPath) + '"')

      internalMkDirs(sftp, outPath, function (err) {
        if (err) return end(err, callback)
        log('Writing \'' + colors.cyan(outPath) + '\'')

        var write = sftp.createWriteStream(outPath, options)

        write
          .on('error', done)
          .on('finish', done)

        if (file.isStream()) {
          file.contents.pipe(write)
        } else if (file.isBuffer()) {
          write.end(file.contents)
        }

        function done (err) {
          if (err) return end(err, callback)
          log('Finished writing \'' + colors.cyan(outPath) + '\'')
          callback()
        }
      })
    })
  }, function (callback) {
    end(null, callback)
  })
}

GulpSSH.prototype.shell = function (commands, options) {
  var chunkSize = 0
  var chunks = []
  var ssh = this.getClient()
  var outStream = through.obj()

  if (!commands) throw new PluginError(packageName, '`commands` required.')

  options = options || {}
  commands = Array.isArray(commands) ? commands.slice() : [commands]

  function endStream () {
    outStream.push(new File({
      cwd: __dirname,
      base: __dirname,
      path: path.join(__dirname, options.filePath || 'gulp-ssh.exec.log'),
      contents: Buffer.concat(chunks, chunkSize)
    }))

    ssh.end()
    outStream.end()
  }

  ssh.gulpReady(function () {
    if (commands.length === 0) return endStream()
    ssh.shell(function (err, stream) {
      if (err) return outStream.emit('error', new PluginError(packageName, err))

      stream
        .on('data', function (chunk) {
          chunkSize += chunk.length
          chunks.push(chunk)
          outStream.emit('ssh2Data', chunk)
        })
        .on('close', endStream)
        .stderr.on('data', function (data) {
          outStream.emit('error', new PluginError(packageName, data + ''))
        })

      var lastCommand
      commands.forEach(function (command) {
        if (command[command.length - 1] !== '\n') command += '\n'
        log(packageName + ' :: shell :: ' + command)
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
      log('Creating directory \'' + colors.cyan(outPathDir) + '\'')
      sftp.mkdir(outPathDir, callback)
    })
  })
}
