# gulp-ssh

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
    host: 'angularjs.cn',
    port: 22,
    username: 'root',
    privateKey: require('fs').readFileSync('/Users/zensh/.ssh/id_rsa')
  }
});

// execute commands
gulp.task('exec', function () {
  return gulpSSH.exec(['uptime', 'ls -a', 'pwd']);
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
Default: `true`

Ignore errors when executing commands.

*****

### gulpSSH.connect(options)

return `this`

### gulpSSH.exec(commands, options)

return `stream`

### gulpSSH.sftp(command, filePath, options)

return `stream`


## License

MIT © [Teambition](http://teambition.com)
