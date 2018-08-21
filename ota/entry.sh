#!/bin/bash

export NODE_PRIORITIZED_PATH=/usr/lib/node_modules

while true; do
  /usr/bin/iotjs /usr/lib/yoda/ota/index.js
  sleep 1800
done
