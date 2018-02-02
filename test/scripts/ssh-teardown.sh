#!/bin/bash

. test/scripts/sshrc

kill $(cat $SSH_SERVER_HOME/pid)
rm -rf $SSH_SERVER_HOME
rm -rf $SSH_CLIENT_HOME
rm -rf ~/.ssh
if [ -d ~/.ssh~ ]; then
  mv ~/.ssh~ ~/.ssh
fi
