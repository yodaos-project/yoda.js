cmake_minimum_required(VERSION 3.0)
project(node-minimatch CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB NODE_MINIMATCH_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${NODE_MINIMATCH_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
