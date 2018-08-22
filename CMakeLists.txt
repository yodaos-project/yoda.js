cmake_minimum_required(VERSION 3.0)
project(rokidos_nodejs CXX)
include(ExternalProject)
find_package(Git REQUIRED)

macro(YodaLocalPackage NAME)
ExternalProject_Add(${NAME}
  SOURCE_DIR packages/${NAME}
  CMAKE_ARGS
    -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
    -DCMAKE_INCLUDE_DIR=${CMAKE_INCLUDE_DIR}
    -DCMAKE_INSTALL_DIR=${CMAKE_INSTALL_DIR}/usr/lib/node_modules/${NAME}
    -DCMAKE_SYSROOT=${CMAKE_EXTERNAL_SYSROOT}
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
    -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER})
endmacro()

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


# Bluetooth
YodaLocalPackage(bluetooth)

# Input
YodaLocalPackage(input)

# shadow-ffi
YodaGitPackage(ffi https://github.com/shadow-node/ffi.git master)

# tape: test framework
YodaGitPackage(tape https://github.com/shadow-node/tape.git master)

# turen
YodaGitPackage(turen https://github.com/Rokid/node-turen.git master)

# extapp client
YodaGitPackage(extapp https://github.com/Rokid/node-extapp.git master)

# Logger
YodaLocalPackage(logger)

# lockfile
YodaLocalPackage(lockfile)

# Light
YodaLocalPackage(light)

# Multimedia
YodaLocalPackage(multimedia)

# PowerCtrl
YodaLocalPackage(battery)

# Property
YodaLocalPackage(property)

# System
YodaLocalPackage(system)

# TextToSpeech
YodaLocalPackage(tts)

# Volume Controls
YodaLocalPackage(audio)

# Wifi Controls
YodaLocalPackage(wifi)

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
install(DIRECTORY ./cloudappclient  DESTINATION /usr/lib/yoda)

