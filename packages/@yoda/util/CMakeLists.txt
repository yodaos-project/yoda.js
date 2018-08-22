cmake_minimum_required(VERSION 3.0)
project(node-yoda-util CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_UTIL_SRC *.js)

install(FILES ${YODA_UTIL_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
