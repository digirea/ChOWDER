@echo off

pushd %~dp0..
cd redis
start redis-server.exe
cd ..\server\cluster
node index.js
popd