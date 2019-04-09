#!/bin/bash
set -ex

shadow_node_version=`cat package.json | jq -r '.engine."shadow-node"'`
url="https://github.com/yodaos-project/ShadowNode/releases/download/v$shadow_node_version/shadow-node-v$shadow_node_version-$(uname)-$(uname -m).tar.gz"
file_name="shadow-node-v$shadow_node_version-$(uname)-$(uname -m).tar.gz"

cd /tmp
  wget $url
  tar -xzf $file_name
  sudo cp ./usr/bin/iotjs /usr/local/bin
cd -

type iotjs
iotjs --version || true
