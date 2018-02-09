gulp-ssh
====
SSH and SFTP tasks for gulp

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][downloads-url]
[![CI Status][ci-image]][ci-url]

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

* ...and so forth.

For a full list of connection options, see the reference for the [connect()](https://github.com/mscdex/ssh2#client-methods) method from the SSH2 module.

#### options.ignoreErrors

Type: `Boolean`

Ignore errors when executing commands. **Default:** (false)

*****

### gulpSSH.shell(commands, options)

return `stream`, there is a event "ssh2Data" on stream that emit ssh2 stream's chunk.

**IMPORTANT:** If one of the commands requires user interaction, this function will hang.
Observe the ssh2Data event to debug the interaction with the server.

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

**IMPORTANT:** If one of the commands requires user interaction, this function will hang.
Observe the ssh2Data event to debug the interaction with the server.

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

## Tests

This library is an SSH/SFTP transfer client.
Therefore, we need to connect to an SSH server to test it.

The strategy used to test this library is to connect to the current machine as the current user over SSH.
This allows the tests to verify both ends of the SSH transfer.

To run the tests, you need a local SSH server running and an SSH key the tests can use to authenticate against it.
(The instructions in this section are specific to Linux).

First, let's generate an SSH key without a passphrase for the tests to use.

```sh
mkdir -p test/etc/ssh
ssh-keygen -t rsa -b 4096 -N "" -f test/etc/ssh/id_rsa -q
chmod 600 test/etc/ssh/id_rsa*
```

Next, add this key to the authorized SSH keys for the current user:

```sh
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat test/etc/ssh/id_rsa.pub > ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

If you already have an SSH server running on your machine, you can use it to run the tests.
Let's test to make sure we can connect to it.

```sh
ssh -i etc/test/ssh $USER@localhost uptime
```

You should see the uptime of the current machine printed to the console.
If that works, you're ready to run the tests!

```sh
yarn test
```

If you don't have an SSH server running, you can run one on a user-space port (2222) for the tests.
Start by creating a server configuration and host key:

```sh
mkdir -p test/etc/sshd
cat << EOF > test/etc/sshd/sshd_config
Port 2222
ListenAddress 127.0.0.1
HostKey $(pwd)/test/etc/sshd/host_rsa
PidFile $(pwd)/test/etc/sshd/pid
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
Subsystem sftp /usr/lib/openssh/sftp-server
UsePAM no
EOF
ssh-keygen -t rsa -b 4096 -N "" -f test/etc/sshd/host_rsa -q
```

Next, start the server:

```
/usr/sbin/sshd -f test/etc/sshd/sshd_config
```

If the sshd command is missing, you'll need to install the openssh-server package for your distribution.

Let's try to connect to it make sure it's running properly:

```sh
ssh -i etc/test/ssh -p 2222 $USER@localhost uptime
```

You should see the uptime of the current machine printed to the console.
If that works, you're ready to run the tests!

```sh
CI=true yarn test
```

We pass CI=true so that the tests use port 2222 to connect instead of the default port.

When you're done running the tests, you can use this command to stop the SSH server:

```
kill $(cat test/etc/sshd/pid)
```

In the test/scripts directory you can find the setup and teardown process that's used in CI to run these tests, which is similar to the one described in this section.

## License

MIT © [Teambition](https://www.teambition.com)

[npm-url]: https://npmjs.org/package/gulp-ssh
[npm-image]: http://img.shields.io/npm/v/gulp-ssh.svg

[downloads-url]: https://npmjs.org/package/gulp-ssh
[downloads-image]: http://img.shields.io/npm/dm/gulp-ssh.svg

[ci-url]: https://travis-ci.org/teambition/gulp-ssh
[ci-image]: https://img.shields.io/travis/teambition/gulp-ssh/master.svg
