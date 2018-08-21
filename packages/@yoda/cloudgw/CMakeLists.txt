cmake_minimum_required(VERSION 3.0)
project(node-yoda-cloudgw CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_CLOUDGW_SRC *.js)

install(FILES ${YODA_CLOUDGW_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
