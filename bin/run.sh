#!/bin/sh

ORIGIN=`pwd`

cd `dirname $0`/..

cd redis && ./redis-server &\
sleep 3s ; cd server && node ./server.js && fg &\
turnserver -c ../bin/turnserver.conf

cd $ORIGIN
