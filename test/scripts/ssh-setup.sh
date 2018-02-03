#!/bin/bash

. test/scripts/sshrc

# set up ssh server
mkdir -p $SSH_SERVER_HOME
cat << EOF > $SSH_SERVER_HOME/sshd_config
Port 2222
ListenAddress 127.0.0.1
HostKey $SSH_SERVER_HOME/host_rsa
PidFile $SSH_SERVER_HOME/pid
PasswordAuthentication yes
PubkeyAuthentication yes
ChallengeResponseAuthentication no
EOF
ssh-keygen -t rsa -b 4096 -N "" -f $SSH_SERVER_HOME/host_rsa -q
/usr/sbin/sshd -f $SSH_SERVER_HOME/sshd_config

# set up ssh client
mkdir -p $SSH_CLIENT_HOME
ssh-keygen -t rsa -b 4096 -N "" -C gulp-ssh-test -f $SSH_CLIENT_HOME/id_rsa -q
if [ -d ~/.ssh ]; then
  mv ~/.ssh ~/.ssh~
fi
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat $SSH_CLIENT_HOME/id_rsa.pub > ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat << EOF > ~/.ssh/config
Host localhost
  StrictHostKeyChecking no
EOF
chmod 600 ~/.ssh/config
