#!/bin/bash

brew update

PKGS="
  cmake
  node
  yarn
  jq
"

for pkg in $PKGS
do
  brew install $pkg
done
