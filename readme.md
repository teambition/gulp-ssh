# gulp-ssh

> SSH and SFTP tasks for gulp


## Install

Install with [npm](https://npmjs.org/package/gulp-ssh)

```
npm install --save-dev gulp-ssh
```


## Example

    var gulp = require('gulp');
    var ssh = require('gulp-ssh');

    gulp.task('default', function () {
      ssh.exec({
        command: ['uptime', 'ls -a'],
        sshConfig: {
          host: 'angularjs.cn',
          port: 22,
          username: 'username',
          password: 'password'
        }
      })
    });

## API

### ssh.exec(options)

#### options.command

*Required*
Type: `String` or `Array`

a command string or commands array to exec.

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

### ssh.sftp(options)

TODO

## License

MIT © [Teambition](http://teambition.com)
