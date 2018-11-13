#!/usr/bin/env bash
set -e

NOW_EPOCH_TIMESTAMP=`date +%s`
MQTT_VERSION="1"
MQTT_SERVICE="mqtt"
MQTT_HOST=""
DEVICE_ID=""
DEVICE_TYPE_ID=""
DEVICE_KEY=""
DEVICE_SECRET=""
MASTER_ID=""

while [ $# -gt 0 ]; do
  case "$1" in
    -k)
      DEVICE_KEY="$2"
      shift
      ;;
    -s)
      DEVICE_SECRET="$2"
      shift
      ;;
    -u)
      MASTER_ID="$2"
      shift
      ;;
    -h)
      MQTT_HOST="$2"
      shift
      ;;
    --device-id)
      DEVICE_ID="$2"
      shift
      ;;
    --device-type-id)
      DEVICE_TYPE_ID="$2"
      shift
      ;;
    --*)
      echo "Illegal option $1"
      ;;
  esac
  shift $(( $# > 0 ? 1 : 0 ))
done

if [[ -z $DEVICE_KEY ]]; then
  printf "Error: You must provide -k with device key\n"
  exit 1
fi

if [[ -z $DEVICE_SECRET ]]; then
  printf "Error: You must provide -s with device secret\n"
  exit 1
fi

if [[ -z $MASTER_ID ]]; then
  printf "Error: You must provide -u with account id\n"
  exit 1
fi

if [[ -z $MQTT_HOST ]]; then
  MQTT_HOST="wormhole-registry.rokid.com"
fi

PAYLOAD_RAW="
  key=$DEVICE_KEY
  device_type_id=$DEVICE_TYPE_ID
  device_id=$DEVICE_ID
  service=$MQTT_SERVICE
  version=$MQTT_VERSION
  time=$NOW_EPOCH_TIMESTAMP
  secret=$DEVICE_SECRET
"

qs_stringify() {
  local IFS="$1"; shift; echo "$*";
}

PAYLOAD_QUERY_STR=`qs_stringify '&' $PAYLOAD_RAW`
REQUEST_SIGN=`echo $PAYLOAD_QUERY_STR | head -c -1 | md5sum | head -n1 | cut -d " " -f1 | awk '{print toupper($0)}'`
PAYLOAD_MSG="{
  \"appKey\": \"$DEVICE_KEY\",
  \"requestSign\": \"$REQUEST_SIGN\",
  \"deviceTypeId\": \"$DEVICE_TYPE_ID\",
  \"deviceId\": \"$DEVICE_ID\",
  \"accountId\": \"$MASTER_ID\",
  \"service\": \"$MQTT_SERVICE\",
  \"time\": \"$NOW_EPOCH_TIMESTAMP\",
  \"version\": \"$MQTT_VERSION\"
}"

# start request
curl -H "Content-Type: application/json" \
  -d "$PAYLOAD_MSG" \
  "https://$MQTT_HOST/api/registryByKey"

