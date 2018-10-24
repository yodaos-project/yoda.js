cmake_minimum_required(VERSION 3.0)
project(node-exodus CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_EXODUS_SRC *.js)

install(FILES ${YODA_EXODUS_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
