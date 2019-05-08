#!/bin/bash

set -ex

sudo apt-key adv --fetch-keys http://dl.yarnpkg.com/debian/pubkey.gpg
echo "deb http://dl.yarnpkg.com/debian/ stable main" | \
  sudo tee /etc/apt/sources.list.d/yarn.list

# Fingerprint: 6084 F3CF 814B 57C1 CF12 EFD5 15CF 4D18 AF4F 7421
wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | sudo apt-key add -
echo "
deb http://apt.llvm.org/bionic/ llvm-toolchain-bionic main
deb-src http://apt.llvm.org/bionic/ llvm-toolchain-bionic main
deb http://apt.llvm.org/bionic/ llvm-toolchain-bionic-8 main
deb-src http://apt.llvm.org/bionic/ llvm-toolchain-bionic-8 main
" | sudo tee /etc/apt/sources.list.d/llvm.list

sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test

sudo apt-get update -q
sudo apt-get install -q -y --allow-unauthenticated \
    cmake \
    clang-format-8 \
    build-essential \
    jq \
    yarn

sudo ln -s /usr/bin/clang-format-8 /usr/bin/clang-format-8.0
