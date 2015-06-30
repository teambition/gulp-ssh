# gulp-ssh v0.3.3

> SSH and SFTP tasks for gulp


## Install

Install with [npm](https://npmjs.org/package/gulp-ssh)

```
npm install --save-dev gulp-ssh
```


## Example

```js
var gulp = require('gulp');
var gulpSSH = require('gulp-ssh')({
  ignoreErrors: false,
  sshConfig: {
    host: '192.168.0.22',
    port: 22,
    username: 'root',
    privateKey: require('fs').readFileSync('/Users/zensh/.ssh/id_rsa')
  }
});

// execute commands
gulp.task('exec', function () {
  return gulpSSH
    .exec(['uptime', 'ls -a', 'pwd'], {filePath: 'commands.log'})
    .pipe(gulp.dest('logs'));
});

// get file from server and write to local
gulp.task('sftp-read', function () {
  return gulpSSH.sftp('read', 'pm2.json')
    .pipe(gulp.dest(''));
});

// put local file to server
gulp.task('sftp-write', function () {
  return gulp.src('index.js')
    .pipe(gulpSSH.sftp('write', 'test.js'));
});

// execute commands in shell
gulp.task('shell', function () {
  return gulpSSH
    .shell(['cd /home/thunks', 'git pull', 'npm install', 'npm update', 'npm test'], {filePath: 'shell.log'})
    .pipe(gulp.dest('logs'));
});
```

## API

```js
var GulpSSH = require('gulp-ssh');
```

### GulpSSH(options)

```js
var gulpSSH = new GulpSSH(options);
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

### gulpSSH.connect(sshConfig)

return `gulpSSH`

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

### gulpSSH.close()

Close the ssh connection.

## License

MIT © [Teambition](http://teambition.com)
