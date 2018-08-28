cmake_minimum_required(VERSION 3.0)
project(shadow-zeromq CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(shadow-zeromq MODULE ZmqNative.cc)
target_include_directories(shadow-zeromq PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(shadow-zeromq iotjs zmq)
set_target_properties(shadow-zeromq PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "zeromq"
  LINK_FLAGS "-rdynamic")

install(TARGETS shadow-zeromq DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})

