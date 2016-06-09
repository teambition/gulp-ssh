gulp-ssh
====
SSH and SFTP tasks for gulp

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][downloads-url]

## Install

Install with [npm](https://npmjs.org/package/gulp-ssh)

```
npm install --save-dev gulp-ssh
```

## Example

```js
'use strict'

var fs = require('fs');
var gulp = require('gulp')
var GulpSSH = require('gulp-ssh')

var config = {
  host: '192.168.0.21',
  port: 22,
  username: 'node',
  privateKey: fs.readFileSync('/Users/zensh/.ssh/id_rsa')
}

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
    .src(['./**/*.js', '!**/node_modules/**'])
    .pipe(gulpSSH.dest('/home/iojs/test/gulp-ssh/'))
})

gulp.task('sftp-read', function () {
  return gulpSSH.sftp('read', '/home/iojs/test/gulp-ssh/index.js', {filePath: 'index.js'})
    .pipe(gulp.dest('logs'))
})

gulp.task('sftp-write', function () {
  return gulp.src('index.js')
    .pipe(gulpSSH.sftp('write', '/home/iojs/test/gulp-ssh/test.js'))
})

gulp.task('shell', function () {
  return gulpSSH
    .shell(['cd /home/iojs/test/thunks', 'git pull', 'npm install', 'npm update', 'npm test'], {filePath: 'shell.log'})
    .pipe(gulp.dest('logs'))
})
```

## API

```js
var GulpSSH = require('gulp-ssh')
```

### GulpSSH(options)

```js
var gulpSSH = new GulpSSH(options)
```

#### options.sshConfig

*Required*
Type: `Object`

* **host** - `String` - Hostname or IP address of the server. **Default:** 'localhost'

* **port** - `Number` - Port number of the server. **Default:** 22

* **username** - `String` - Username for authentication. **Default:** (none)

* **password** - `String` - Password for password-based user authentication. **Default:** (none)

* **privateKey** - `String` or `Buffer` - Buffer or string that contains a private key for key-based user authentication (OpenSSH format). **Default:** (none)

More [SSH Connection methods](https://github.com/mscdex/ssh2#connection-methods)

#### options.ignoreErrors

Type: `Boolean`

Ignore errors when executing commands. **Default:** (false)

*****

### gulpSSH.shell(commands, options)

return `stream`, there is a event "ssh2Data" on stream that emit ssh2 stream's chunk.

#### commands

*Required*
Type: `String` or `Array`

#### options.filePath

*Option*
Type: `String`

file path to write on local. **Default:** ('gulp-ssh.shell.log')

#### options.autoExit

*Option*
Type: `Boolean`

auto exit shell. **Default:** (true)

### gulpSSH.exec(commands, options)

return `stream`, there is a event "ssh2Data" on stream that emit ssh2 stream's chunk.

#### commands

*Required*
Type: `String` or `Array`

#### options.filePath

*Option*
Type: `String`

file path to write on local. **Default:** ('gulp-ssh.exec.log')


### gulpSSH.sftp(command, filePath, options)

return `stream`

#### command

*Required*
Type: `String`
Value: 'read' or 'write'

#### filePath

*Required*
Type: `String`

file path to read or write on server. **Default:** (none)

#### options

*Option*
Type: `Object`

### gulpSSH.dest(destDir, options)

return `stream`, copy the files to remote through sftp, acts similarly to Gulp dest, will make dirs if not exist.

## License

MIT © [Teambition](https://www.teambition.com)

[npm-url]: https://npmjs.org/package/gulp-ssh
[npm-image]: http://img.shields.io/npm/v/gulp-ssh.svg

[downloads-url]: https://npmjs.org/package/gulp-ssh
[downloads-image]: http://img.shields.io/npm/dm/gulp-ssh.svg?style=flat-square
