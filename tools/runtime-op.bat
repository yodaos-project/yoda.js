@echo off
title YodaOS tools - runtime operation

set "lightd=NO"
set "multimediad=NO"
set "vuid=NO"
set "ttsd=NO"
set "only=NO"
set "sn="

if "%1"=="" (
  call:help
  goto end
)

:check_parameters
  set "p=%1"
  if "%p%"=="" (
    goto start_operate
  ) else if "%p%"=="help" (
    call:help
    goto end
  ) else if "%p%"=="-h" (
    call:help
    goto end
  ) else if "%p%"=="--help" (
    call:help
    goto end
  ) else if "%p%"=="--lightd" (
    set "only=YES"
    set "lightd=YES"
  ) else if "%p%"=="--multimediad" (
    set "only=YES"
    set "multimediad=YES"
  ) else if "%p%"=="--vuid" (
    set "only=YES"
    set "vuid=YES"
  ) else if "%p%"=="--ttsd" (
    set "only=YES"
    set "ttsd=YES"
  ) else if "%p%"=="-s" (
    set sn=%2
    shift
  )
  shift
goto check_parameters

:help
  echo.
  echo Usage:
  echo  --lightd        only apply to lightd service
  echo  --multimediad   only apply to multimediad service
  echo  --vuid          only apply to vuid service
  echo  --ttsd          only apply to ttsd service
  echo.
  echo Options:
  echo  -s              serial number.
  echo.
  echo By default operation is going to be applyed to all services.
  echo.
  echo Example:
  echo ^> tools\runtime-op --vuid restart'
  echo ^> tools\runtime-op restart'
goto :eof

:shell
  if "%sn%"=="" (
    adb shell %1
  ) else (
    adb -s %sn% shell %1
  )
goto :eof

:op
  echo.
  echo ^>^> %2ing %1...
  if "%sn%"=="" (
    adb shell /etc/init.d/%1 %2
  ) else (
    adb -s %sn% shell /etc/init.d/%1 %2
  )
goto :eof

:start_operate
  rem echo lightd=%lightd% multimediad=%multimediad% vuid=%vuid% ttsd=%ttsd% only=%only% sn=%sn%
  call:shell "mount -o remount,rw /"
  if "%only%"=="NO" (
    set "lightd=YES"
    set "multimediad=YES"
    set "vuid=YES"
    set "ttsd=YES"
  )
  if "%lightd%"=="YES" (
    call:op lightd %0
  )
  if "%multimediad%"=="YES" (
    call:op multimediad %0
  )
  if "%vuid%"=="YES" (
    call:op vui-daemon %0
  )
  if "%ttsd%"=="YES" (
    call:op ttsd %0
  )
goto :eof

:end
@echo on
