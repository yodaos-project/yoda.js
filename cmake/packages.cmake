cmake_minimum_required(VERSION 2.8)

set(YODART_SOURCE_DIR ${CMAKE_SOURCE_DIR} CACHE PATH "yodart source directory")
list(INSERT CMAKE_INCLUDE_PATH 0 ${YODART_SOURCE_DIR}/include)

set(YODAPKG_INSTALL_PREFIX ${CMAKE_BINARY_DIR}/node_modules)

function(YodaLocalPackage NAME)
  set(PATH ${NAME})
  if(ARGC GREATER 1)
    set(PATH ${ARGV1})
  endif()

  set(YODAPKG_INSTALL_DIR ${YODAPKG_INSTALL_PREFIX}/${PATH})
  string(REPLACE ";" "|" CMAKE_PREFIX_PATH_ALT_SEP "${CMAKE_PREFIX_PATH}")
  string(REPLACE ";" "|" CMAKE_INCLUDE_PATH_ALT_SEP "${CMAKE_INCLUDE_PATH}")
  string(REPLACE ";" "|" CMAKE_LIBRARY_PATH_ALT_SEP "${CMAKE_LIBRARY_PATH}")

  ExternalProject_Add(${NAME}
    SOURCE_DIR ${CMAKE_SOURCE_DIR}/packages/${PATH}
    INSTALL_DIR ${YODAPKG_INSTALL_DIR}
    LIST_SEPARATOR | # Use the alternate list separator
    CMAKE_ARGS
      -DYODAOS_VERSION=${CMAKE_PROJECT_VERSION}
      -DYODART_SOURCE_DIR=${YODART_SOURCE_DIR}
      -DNODEJS_VARIANT=shadow-node
      -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
      -DCMAKE_BUILD_HOST=${CMAKE_BUILD_HOST}
      -DCMAKE_MODULE_PATH=${CMAKE_SOURCE_DIR}/cmake/module
      -DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH_ALT_SEP}
      -DCMAKE_INCLUDE_PATH=${CMAKE_INCLUDE_PATH_ALT_SEP}
      -DCMAKE_LIBRARY_PATH=${CMAKE_LIBRARY_PATH_ALT_SEP}
      -DCMAKE_INSTALL_PREFIX=${YODAPKG_INSTALL_DIR}
      # cross-compiling
      -DCMAKE_SYSROOT=${CMAKE_EXTERNAL_SYSROOT}
      -DCMAKE_SYSTEM_PERFIX_PATH=${CMAKE_SYSTEM_PREFIX_PATH}
      -DCMAKE_STAGING_PERFIX=${CMAKE_STAGING_PREFIX}
      -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
      -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
      -DCMAKE_EXTERNAL_SYSTEM_PROCESSOR=${CMAKE_SYSTEM_PROCESSOR}
      # compat
      -DCMAKE_INSTALL_DIR=./
      -DCMAKE_INCLUDE_DIR=${CMAKE_INCLUDE_DIR}
      -DJSRUNTIME_SOURCE_DIR=${YODART_SOURCE_DIR}
  )
endfunction()

function(YodaGitPackage NAME REPO TAG)
  set(PATH ${NAME})
  if(ARGC GREATER 3)
    set(PATH ${ARGV3})
  endif()

  set(YODAPKG_INSTALL_DIR ${YODAPKG_INSTALL_PREFIX}/${PATH})
  string(REPLACE ";" "|" CMAKE_PREFIX_PATH_ALT_SEP "${CMAKE_PREFIX_PATH}")
  string(REPLACE ";" "|" CMAKE_INCLUDE_PATH_ALT_SEP "${CMAKE_INCLUDE_PATH}")
  string(REPLACE ";" "|" CMAKE_LIBRARY_PATH_ALT_SEP "${CMAKE_LIBRARY_PATH}")

  ExternalProject_Add(${NAME}
    PREFIX ${CMAKE_BINARY_DIR}/packages/${PATH}
    INSTALL_DIR ${YODAPKG_INSTALL_DIR}
    GIT_REPOSITORY ${REPO}
    GIT_TAG ${TAG}
    TIMEOUT 10
    UPDATE_COMMAND ${GIT_EXECUTABLE} pull
    LOG_DOWNLOAD ON
    LIST_SEPARATOR | # Use the alternate list separator
    CMAKE_ARGS
      -DLIBFFI_LINK_EXTERNAL=YES
      -DYODAOS_VERSION=${CMAKE_PROJECT_VERSION}
      -DYODART_SOURCE_DIR=${YODART_SOURCE_DIR}
      -DNODEJS_VARIANT=shadow-node
      -DLINK_DIRECTORIES=${CMAKE_LIBRARY_PATH_ALT_SEP}
      -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
      -DCMAKE_BUILD_HOST=${CMAKE_BUILD_HOST}
      -DCMAKE_MODULE_PATH=${CMAKE_SOURCE_DIR}/cmake/module
      -DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH_ALT_SEP}
      -DCMAKE_INCLUDE_PATH=${CMAKE_INCLUDE_PATH_ALT_SEP}
      -DCMAKE_LIBRARY_PATH=${CMAKE_LIBRARY_PATH_ALT_SEP}
      -DCMAKE_INSTALL_PREFIX=${YODAPKG_INSTALL_DIR}
      # cross-compiling
      -DCMAKE_SYSROOT=${CMAKE_EXTERNAL_SYSROOT}
      -DCMAKE_SYSTEM_PERFIX_PATH=${CMAKE_SYSTEM_PREFIX_PATH}
      -DCMAKE_STAGING_PERFIX=${CMAKE_STAGING_PREFIX}
      -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
      -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
      -DCMAKE_EXTERNAL_SYSTEM_PROCESSOR=${CMAKE_SYSTEM_PROCESSOR}
      # compat
      -DCMAKE_INSTALL_DIR=./
      -DCMAKE_INCLUDE_DIR=${CMAKE_INCLUDE_DIR}
      -DJSRUNTIME_SOURCE_DIR=${YODART_SOURCE_DIR}
  )
endfunction()

YodaGitPackage(ffi https://github.com/shadow-node/ffi.git master)
YodaGitPackage(node-flock https://github.com/shadow-node/node-flock.git master)
YodaGitPackage(node-caps https://github.com/shadow-node/node-caps.git master @yoda/caps)
YodaGitPackage(node-flora https://github.com/yodaos-project/node-flora.git master @yoda/flora)

YodaLocalPackage(yoda-battery @yoda/battery)
YodaLocalPackage(yoda-bluetooth @yoda/bluetooth)
YodaLocalPackage(yoda-bolero @yoda/bolero)
YodaLocalPackage(yoda-exodus @yoda/exodus)
YodaLocalPackage(yoda-manifest @yoda/manifest)
YodaLocalPackage(yoda-oh-my-little-pony @yoda/oh-my-little-pony)
YodaLocalPackage(yoda-util @yoda/util)
YodaLocalPackage(yoda-network @yoda/network)
YodaLocalPackage(yoda-env @yoda/env)

YodaLocalPackage(yodaos-application @yodaos/application)
YodaLocalPackage(yodaos-effect @yodaos/effect)
YodaLocalPackage(yodaos-keyboard @yodaos/keyboard)
YodaLocalPackage(yodaos-speech-synthesis @yodaos/speech-synthesis)
YodaLocalPackage(yodaos-storage @yodaos/storage)

# root scope packages
YodaLocalPackage(glob)
YodaLocalPackage(logger)
YodaLocalPackage(lru-cache)
YodaLocalPackage(minimatch)
YodaLocalPackage(step)

if(NOT CMAKE_BUILD_HOST)
  # local packages
  YodaLocalPackage(yoda-audio @yoda/audio)
  YodaLocalPackage(yoda-httpdns @yoda/httpdns)
  YodaLocalPackage(yoda-httpsession @yoda/httpsession)
  YodaLocalPackage(yoda-input @yoda/input)
  YodaLocalPackage(yoda-light @yoda/light)
  YodaLocalPackage(yoda-multimedia @yoda/multimedia)
  YodaLocalPackage(yoda-ota @yoda/ota)
  YodaLocalPackage(yoda-property @yoda/property)
  YodaLocalPackage(yoda-system @yoda/system)
  YodaLocalPackage(yoda-wifi @yoda/wifi)
endif()

install(DIRECTORY ${YODAPKG_INSTALL_PREFIX} DESTINATION /usr/lib)
