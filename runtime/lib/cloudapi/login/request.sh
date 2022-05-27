#!/usr/bin/env bash

HOST="device-account-v2.rokid.com"
ROKID_MASTER_ID=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h)
      HOST="$2"
      shift
      ;;
    -u)
      ROKID_MASTER_ID="$2"
      shift
      ;;
    --*)
      echo "Illegal option $1"
      ;;
  esac
  shift $(( $# > 0 ? 1 : 0 ))
done

for i_retry in $(seq 1 6)
do 

NOW_EPOCH_TIMESTAMP=`date +%s`
DEVICE_ID=`getprop ro.boot.serialno`
DEVICE_TYPE_ID=`getprop ro.boot.devicetypeid`

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

result=$(curl -D /tmp/LOGIN_HEADER -H "Content-Type: application/x-www-form-urlencoded" -d "$POST_DATA" $URI)
if [ $? -eq 0 ] && [[ "x${result}" != "x" ]]; then
  echo $result
  exit 0
else
  >&2 echo $result
  sleep 2
fi

done

