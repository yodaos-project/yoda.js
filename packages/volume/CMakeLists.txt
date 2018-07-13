cmake_minimum_required(VERSION 3.0)
project(node-volume CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-volume MODULE src/VolumeNative.cc)
target_include_directories(node-volume PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-volume iotjs rkvolumecontrol)
set_target_properties(node-volume PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "volume"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-volume DESTINATION ${CMAKE_INSTALL_DIR})
