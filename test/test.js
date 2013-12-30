'use strict';

var ssh = require('../index');
console.log(ssh);
ssh.exec({
  command: ['uptime', 'ls -a'],
  sshConfig: {
    host: 'angularjs.cn',
    port: 22,
    username: 'username',
    password: 'password'
  }
})
