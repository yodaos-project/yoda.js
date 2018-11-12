#!/usr/bin/env bash

HOST="device-account.rokid.com"

while [ $# -gt 0 ]; do
  case "$1" in
    -h)
      HOST="$2"
      shift
      ;;
    --*)
      echo "Illegal option $1"
      ;;
  esac
  shift $(( $# > 0 ? 1 : 0 ))
done

NOW_EPOCH_TIMESTAMP=`date +%s`
DEVICE_ID=`getprop ro.boot.serialno`
DEVICE_TYPE_ID=`getprop ro.boot.devicetypeid`
ROKID_MASTER_ID=`getprop app.network.masterId`
setprop app.network.masterId ""

__DIRNAME=`dirname $0`
DEVICE_SECRET=`sh ${__DIRNAME}/print-secret.sh`

MY_SIGN="${DEVICE_SECRET}${DEVICE_TYPE_ID}${DEVICE_ID}${NOW_EPOCH_TIMESTAMP}${DEVICE_SECRET}"
RL_SIGN=`echo $MY_SIGN | head -c -1 | md5sum | head -n1 | cut -d " " -f1 | awk '{print toupper($0)}'`
MY_OPTS="
  deviceId=$DEVICE_ID
  deviceTypeId=$DEVICE_TYPE_ID
  namespaces=basic_info,custom_config
  time=$NOW_EPOCH_TIMESTAMP
  sign=$RL_SIGN
"

if [[ ! -z $ROKID_MASTER_ID ]]; then
  MY_OPTS="$MY_OPTS  userId=$ROKID_MASTER_ID"
fi

qs_stringify() {
  local IFS="$1"; shift; echo "$*";
}

POST_DATA=`qs_stringify '&' $MY_OPTS`
URI="https://$HOST/device/loginV2.do"

curl -D /tmp/LOGIN_HEADER -H "Content-Type: application/x-www-form-urlencoded" -d "$POST_DATA" $URI
