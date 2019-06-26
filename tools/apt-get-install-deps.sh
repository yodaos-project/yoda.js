#!/bin/bash

set -ex
sudo=`command -v sudo || true`
if ! test -z $sudo; then
  sudo+=' -E'
fi

wget -O - https://deb.nodesource.com/setup_10.x | command $sudo bash -

# Fingerprint: 6084 F3CF 814B 57C1 CF12 EFD5 15CF 4D18 AF4F 7421
wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | command $sudo apt-key add -
echo "
deb http://apt.llvm.org/bionic/ llvm-toolchain-bionic main
deb-src http://apt.llvm.org/bionic/ llvm-toolchain-bionic main
deb http://apt.llvm.org/bionic/ llvm-toolchain-bionic-8 main
deb-src http://apt.llvm.org/bionic/ llvm-toolchain-bionic-8 main
" | command $sudo tee /etc/apt/sources.list.d/llvm.list

if ! test -z `command -v add-apt-repository`; then
  command $sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test
fi

command $sudo apt-get update -q
command $sudo apt-get install -q -y --allow-unauthenticated \
    cmake curl git jq \
    clang-format-8 \
    build-essential \
    pulseaudio libpulse-dev \
    libdbus-1-dev \
    libz-dev \
    libffi-dev \
    nodejs

command $sudo ln -s /usr/bin/clang-format-8 /usr/bin/clang-format-8.0
