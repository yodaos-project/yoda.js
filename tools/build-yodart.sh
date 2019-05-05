#!/bin/bash
set -ex

workdir=/workspace
if ! test -z $TRAVIS_BUILD_DIR; then
  workdir=$TRAVIS_BUILD_DIR
fi

apt-get update
apt-get install -y \
    cmake curl git jq \
    pulseaudio libpulse-dev \
    libdbus-1-dev \
    libz-dev \
    libffi-dev

curl -sL https://deb.nodesource.com/setup_10.x | bash -
apt-get install -y \
  nodejs

mkdir /vendor
cd /vendor
git clone https://github.com/yodaos-project/node-flora.git
shadow_node_version=`cat $workdir/package.json | jq -r '.engine."shadow-node"'`
git clone https://github.com/yodaos-project/ShadowNode.git -b v$shadow_node_version

cd /vendor/node-flora
npm install
script/install && script/build
cp -r out/usr/* /usr

cd /vendor/ShadowNode
tools/build.py --buildtype release --napi  --install --install-prefix /usr

cd $workdir
cmake `pwd` -B`pwd`/build -DCMAKE_BUILD_HOST=ON -DCMAKE_EXTERNAL_SYSROOT=/ -DCMAKE_PREFIX_PATH=/ -DCMAKE_INCLUDE_DIR=/
cd build; make install; cd -
