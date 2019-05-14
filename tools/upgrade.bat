@echo off
title YodaOS tools - upgrade

if "%1"=="" (
  call:help
  goto end
) else if not exist "%1" (
  echo '%1' image file not exist, please check the file path.
  goto end
)

adb shell mount -o remount,rw /
adb shell mkdir -p /data/workspace/helper/ >nul
adb push tools\helper\upgrade.js /data/workspace/helper >nul

adb push %1 /data/ota.img
adb shell iotjs /data/workspace/helper/upgrade.js /data/ota.img
goto end

:help
  echo Example:
  echo ^> tools\upgrade 'your-ota.img'
goto :eof

:end
@echo on
