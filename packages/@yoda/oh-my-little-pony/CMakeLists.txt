cmake_minimum_required(VERSION 3.0)
project(node-yoda-oh-my-little-pony CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_OH_MY_LITTLE_PONY_SRC *.js)
install(FILES ${YODA_OH_MY_LITTLE_PONY_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
