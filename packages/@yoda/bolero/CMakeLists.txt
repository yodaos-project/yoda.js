cmake_minimum_required(VERSION 3.0)
project(node-yoda-bolero CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_BOLERO_SRC *.js)

install(FILES ${YODA_BOLERO_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
