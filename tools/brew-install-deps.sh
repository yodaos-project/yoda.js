#!/bin/bash

brew update

PKGS="
  cmake
  node
  yarn
"

for pkg in $PKGS
do
  brew install $pkg
done
