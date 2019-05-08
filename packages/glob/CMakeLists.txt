cmake_minimum_required(VERSION 3.0)
project(node-glob CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB NODE_GLOB_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${NODE_GLOB_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
