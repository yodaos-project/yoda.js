cmake_minimum_required(VERSION 3.0)
project(node-property CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-property MODULE
  src/PropertyNative.cc
)
target_include_directories(node-property PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-property iotjs property android_cutils)
set_target_properties(node-property PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "property"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-property DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})

