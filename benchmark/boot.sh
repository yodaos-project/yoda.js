#!/usr/bin/env bash

start=`date +%s`

adb shell reboot >/dev/null
until false
do
  adb shell echo > /dev/null 2>&1
  test $? != 0 && break
done

end=`date +%s`
echo "shutdown:" `expr $end - $start`
start=`date +%s`

until false
do
  adb forward tcp:37800 tcp:37800 >/dev/null 2>&1 && break
done

end=`date +%s`
echo "adb available:" `expr $end - $start`
start=`date +%s`

until false
do
  output=`yoda-cli flora subscribe --once yodaos.runtime.phase | jq -r '.msg[0]'`
  test $output = 'setup' && break
done

end=`date +%s`
echo "system available:" `expr $end - $start`
