'use strict';

var ssh = require('../index');

ssh.exec({
  command: ['uptime', 'ls -a'],
  sshConfig: {
    host: 'angularjs.cn',
    port: 22,
    username: 'username',
    password: 'password'
  },
  onEnd: function () {
    console.log('Test End!');
  }
});
