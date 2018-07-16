cmake_minimum_required(VERSION 3.0)
project(node-multimedia CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-multimedia MODULE
  src/MultimediaNative.cc
)
target_include_directories(node-multimedia PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-multimedia iotjs rplayer avformat avutil)
set_target_properties(node-multimedia PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "multimedia"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-multimedia DESTINATION ${CMAKE_INSTALL_DIR})
