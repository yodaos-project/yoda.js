cmake_minimum_required(VERSION 3.0)
project(rokidos_nodejs CXX)
include(ExternalProject)
find_package(Git REQUIRED)

function(YodaLocalPackage NAME)
set(PATH ${NAME})
if(ARGC GREATER 1)
set(PATH ${ARGV1})
endif()

ExternalProject_Add(${NAME}
  SOURCE_DIR packages/${PATH}
  CMAKE_ARGS
    -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
    -DCMAKE_INCLUDE_DIR=${CMAKE_INCLUDE_DIR}
    -DCMAKE_INSTALL_DIR=${CMAKE_INSTALL_DIR}/usr/lib/node_modules/${PATH}
    -DCMAKE_SYSROOT=${CMAKE_EXTERNAL_SYSROOT}
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
    -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER})
endfunction()

macro(YodaGitPackage NAME REPO TAG)
ExternalProject_Add(${NAME}
  PREFIX ${CMAKE_CURRENT_SOURCE_DIR}/packages/${NAME}
  GIT_REPOSITORY ${REPO}
  GIT_TAG ${TAG}
  TIMEOUT 10
  UPDATE_COMMAND ${GIT_EXECUTABLE} pull
  LOG_DOWNLOAD ON
  CMAKE_ARGS
    -DLIBFFI_LINK_EXTERNAL=YES
    -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
    -DCMAKE_EXTERNAL_SYSTEM_PROCESSOR=${CMAKE_SYSTEM_PROCESSOR}
    -DCMAKE_INCLUDE_DIR=${CMAKE_INCLUDE_DIR}
    -DCMAKE_INSTALL_DIR=${CMAKE_INSTALL_DIR}/usr/lib/node_modules/${NAME}
    -DCMAKE_SYSROOT=${CMAKE_EXTERNAL_SYSROOT}
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
    -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER})
endmacro()

# remote packages
YodaGitPackage(ffi https://github.com/shadow-node/ffi.git master)
YodaGitPackage(tape https://github.com/shadow-node/tape.git master)
YodaGitPackage(turen https://github.com/Rokid/node-turen.git master)

# local packages
YodaLocalPackage(yoda-audio @yoda/audio)
YodaLocalPackage(yoda-battery @yoda/battery)
YodaLocalPackage(yoda-bluetooth @yoda/bluetooth)
YodaLocalPackage(yoda-cloudgw @yoda/cloudgw)
YodaLocalPackage(yoda-input @yoda/input)
YodaLocalPackage(yoda-light @yoda/light)
YodaLocalPackage(yoda-multimedia @yoda/multimedia)
YodaLocalPackage(yoda-ota @yoda/ota)
YodaLocalPackage(yoda-property @yoda/property)
YodaLocalPackage(yoda-system @yoda/system)
YodaLocalPackage(yoda-speech @yoda/speech)
YodaLocalPackage(yoda-tts @yoda/tts)
YodaLocalPackage(yoda-util @yoda/util)
YodaLocalPackage(yoda-wifi @yoda/wifi)
YodaLocalPackage(yoda-flora @yoda/flora)

# system packages
YodaLocalPackage(bluetooth)
YodaLocalPackage(lockfile)
YodaLocalPackage(logger)
YodaLocalPackage(lru-cache)
YodaLocalPackage(pseudomap)
YodaLocalPackage(yallist)
YodaLocalPackage(zeromq)

# Tools
ExternalProject_Add(rklogger
  SOURCE_DIR tools/rklogger
  CMAKE_ARGS
    -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
    -DCMAKE_INSTALL_PREFIX=${CMAKE_INSTALL_DIR}/usr
    -DCMAKE_INCLUDE_DIR=${CMAKE_INCLUDE_DIR}
    -DCMAKE_SYSROOT=${CMAKE_EXTERNAL_SYSROOT}
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
    -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER})

install(DIRECTORY ./apps            DESTINATION /opt)
install(DIRECTORY ./res/media       DESTINATION /opt)
install(DIRECTORY ./res/light       DESTINATION /opt)
install(DIRECTORY ./runtime         DESTINATION /usr/lib/yoda)
