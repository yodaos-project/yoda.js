@echo off
title YodaOS tools - configure network

set "ssid="
set "psk="

if "%1"=="" (
  call:help
  goto end
)

:parse_parameters
  set "p=%1"
  if "%p%"=="" (
    goto check_parameters
  ) else if "%p%"=="help" (
    call:help
    goto end
  ) else if "%p%"=="-h" (
    call:help
    goto end
  ) else if "%p%"=="--help" (
    call:help
    goto end
  ) else if "%p%"=="-s" (
    set "ssid=%2"
    shift
  ) else if "%p%"=="-p" (
    set "psk=%2"
    shift
  ) else (
    echo Illegal option '%1'.
    goto end
  )
  shift
goto parse_parameters

:check_parameters
  setlocal
  set "hasConfigs=YES"
  if "%ssid%"=="" (
    set "hasConfigs=NO"
  ) else if "%psk%"=="" (
    set "hasConfigs=NO"
  )
  if "%hasConfigs%"=="NO" (
    echo No network modification was made for no ssid or psk specified.
    call:help
    goto end
  ) else (
    goto start_configure
  )
goto :eof

:help
  echo Usage:
  echo  -s ^<ssid^> WiFi ssid
  echo  -p ^<psk^> WiFi Password
  echo.
  echo Example:
  echo ^> tools\configure-network -s ^<ssid^> -p ^<psk^>
goto :eof

:start_configure
adb shell "mount -o remount,rw /"
echo ^>^> Setup Network: %ssid%^@%psk%
for /f "delims=^= tokens=2" %%i in ('adb shell cat /data/system/wpa_supplicant.conf^|findstr /I "^..ssid"') do (
  echo old ssid: %%i
  set "oldssid=%%i"
)
if "%oldssid%"=="" (
  adb shell "echo \"\" >> /data/system/wpa_supplicant.conf"
  adb shell "echo \"network={\" >> /data/system/wpa_supplicant.conf"
  adb shell "echo \"  ssid=%ssid%\" >> /data/system/wpa_supplicant.conf"
  adb shell "echo \"  scan_ssid=1\" >> /data/system/wpa_supplicant.conf"
  adb shell "echo \"  psk=%psk%\" >> /data/system/wpa_supplicant.conf"
  adb shell "echo \"}\" >> /data/system/wpa_supplicant.conf"
  adb shell "echo \"\" >> /data/system/wpa_supplicant.conf"
  adb shell wpa_cli reconfigure
) else (
  echo Device already configured WiFi connection. No network modification was made.
)

:end
@echo on
