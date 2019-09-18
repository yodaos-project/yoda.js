#!/bin/bash

set -ex

sudo apt-key adv --fetch-keys http://dl.yarnpkg.com/debian/pubkey.gpg
echo "deb http://dl.yarnpkg.com/debian/ stable main" | \
  sudo tee /etc/apt/sources.list.d/yarn.list

sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test

sudo apt-get update -q
sudo apt-get install -q -y --allow-unauthenticated \
    cmake \
    build-essential \
    jq \
    yarn
