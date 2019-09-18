#!/bin/bash

set -ex
sudo=`command -v sudo || true`
if ! test -z $sudo; then
  sudo+=' -E'
fi

wget -O - https://deb.nodesource.com/setup_10.x | command $sudo bash -

if ! test -z `command -v add-apt-repository`; then
  command $sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test
fi

command $sudo apt-get update -q
command $sudo apt-get install -q -y --allow-unauthenticated \
    cmake curl git jq \
    build-essential \
    pulseaudio libpulse-dev \
    libdbus-1-dev \
    libz-dev \
    libffi-dev \
    nodejs
