#!/bin/bash
set -ex

workdir=`pwd`

mkdir -p ./vendor
cd $workdir/vendor

if ! test -d node-flora; then
  git clone https://github.com/yodaos-project/node-flora.git
fi
cd $workdir/vendor/node-flora
npm install
script/install --test && script/build --test
cp -r out/usr/* /usr

cd $workdir/vendor
if ! test -d json-c; then
  git clone https://github.com/json-c/json-c.git
fi
cd json-c
mkdir -p build
cd build
cmake ../
make && make install

cd $workdir
cmake `pwd` -B`pwd`/build -DCMAKE_BUILD_HOST=ON -DCMAKE_EXTERNAL_SYSROOT=/ -DCMAKE_PREFIX_PATH=/ -DCMAKE_INCLUDE_DIR=/
cd build
  make DESTDIR=/ install
cd -

cd test/@yodaos/speech-synthesis/src
cmake `pwd` -B`pwd`/build -DCMAKE_BUILD_HOST=ON -DCMAKE_MODULE_PATH="$workdir/cmake/module"
cd build
  make DESTDIR=/ install
cd -
