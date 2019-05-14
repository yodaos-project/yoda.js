@echo off
title YodaOS tools - runtime installation

set "os=YES"
set "test=NO"
set "configs=NO"
set "resources=NO"
set "exclude_app=NO"
set "sn="

:check_parameters
  set "p=%1"
  if "%p%"=="" (
    goto start_install
  ) else if "%p%"=="help" (
    call:help
    goto end
  ) else if "%p%"=="-h" (
    call:help
    goto end
  ) else if "%p%"=="--help" (
    call:help
    goto end
  ) else if "%p%"=="-c" (
    set "configs=YES"
  ) else if "%p%"=="-t" (
    set "test=YES"
    set "os=NO"
  ) else if "%p%"=="--no-os" (
    set "os=NO"
  ) else if "%p%"=="-r" (
    set "resources=YES"
    set "os=NO"
  ) else if "%p%"=="-a" (
    set "test=YES"
    set "resources=YES"
  ) else if "%p%"=="--no-app" (
    set "exclude_app=YES"
  ) else if "%p%"=="-s" (
    set "sn=%2"
    shift
  )
  shift
goto check_parameters

:help
  echo.
  echo Usage:
  echo  -c          Install configuration files.
  echo  -t          Only includes tests.
  echo  -r          Only includes resources.
  echo  -a          Include tests and resources.
  echo  --no-app    Exclude apps.
  echo  --no-os     Exclude runtime and packages.
  echo  -s          Select which device to be installed on if multiple devices presents.
  echo.
  echo. Runtime installation by default, includes all packages, runtime, but no tests and resources.
  echo.
  echo Example:
  echo ^> tools\runtime-install'
  echo ^> tools\runtime-install -s 0502031835000257'
goto :eof

:shell
  if "%sn%"=="" (
    adb shell %1
  ) else (
    adb -s %sn% shell %1
  )
goto :eof

:push
  if "%sn%"=="" (
    adb push %1 %2
  ) else (
    adb -s %sn% %1 %2
  )
goto :eof

:install_os
  echo.
  echo ^>^> install yoda runtime
  call:shell "rm -rf /usr/yoda"
  call:push "runtime" "/usr/yoda"

  echo ^>^> install node_modules
  call:shell "rm -rf /usr/lib/node_modules"
  call:push "packages" "/usr/lib/node_modules"
goto :eof

:install_test
  echo.
  echo ^>^> install test
  call:shell "rm -rf /usr/lib/node_modules/tape"
  call:push "node_modules\tape" "/usr/lib/node_modules/"
  call:push "node_modules\@yoda" "/usr/lib/node_modules/"

  call:shell "rm -rf /data/workspace/test"
  call:push "test" "/data/workspace/"
goto :eof

:install_resources
  echo.
  echo ^>^> install resources
  call:shell "rm -rf /opt/media"
  call:shell "rm -rf /opt/light"
  call:push "res\light" "/opt/"
  call:push "res\media" "/opt/"
goto :eof

:install_apps
  echo.
  echo ^>^> install apps
  setlocal
  set "appdir=apps"
  for /f %%i in ('dir /b %appdir%') do (
    call:shell "rm -rf /opt/apps/%%i"
    rem call:push "apps\%%i" "/opt/apps/"
  )
  call:push "apps" "/opt/"
goto :eof

:install_configs
  echo.
  echo ^>^> install etc config
  call:shell "rm -rf /etc/yoda"
  call:push "etc\yoda" "/etc/"
goto :eof

:start_install
  rem echo os=%os% test=%test% config=%configs% resource=%resources% exclude-app=%exclude_app% sn=%sn%
  call:shell "mount -o remount,rw /"
  if "%os%"=="YES" (
    call:install_os
  )
  if "%resources%"=="YES" (
    call:install_resources
  )
  if "%test%"=="YES" (
    call:install_test
  )
  if "%exclude_app%"=="NO" (
    call:install_apps
  )
  if "%configs%"=="YES" (
    call:install_configs
  )
goto :eof

:end
@echo on
