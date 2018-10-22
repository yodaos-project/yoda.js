#!/usr/bin/env sh

UUID=`getprop ro.boot.serialno`
SEED=`getprop ro.boot.rokidseed`

OUTPUT=`test-stupid ${SEED} ${UUID} | base64`
echo $OUTPUT | head -c -1 | \
  md5sum | head -n1 | cut -d " " -f1 | \
  awk '{print toupper($0)}'
