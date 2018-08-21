cmake_minimum_required(VERSION 3.0)
project(node-ota CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_OTA_SRC *.js)

install(FILES ${YODA_OTA_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
