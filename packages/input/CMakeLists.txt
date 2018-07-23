cmake_minimum_required(VERSION 3.0)
project(node-input CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-input MODULE src/InputNative.cc)
target_include_directories(node-input PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-light iotjs input-event)
set_target_properties(node-light PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "input"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-light DESTINATION ${CMAKE_INSTALL_DIR}/packages/light)
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR}/packages/light)
