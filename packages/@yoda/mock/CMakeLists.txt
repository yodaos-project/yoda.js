cmake_minimum_required(VERSION 3.0)
project(node-yoda-MOCK CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_MOCK_SRC *.js)

install(FILES ${YODA_MOCK_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
