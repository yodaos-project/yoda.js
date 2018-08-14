cmake_minimum_required(VERSION 3.0)
project(shadow-input CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(shadow-input MODULE src/InputNative.cc)
target_include_directories(shadow-input PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(shadow-input iotjs input-event)
set_target_properties(shadow-input PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "input"
  LINK_FLAGS "-rdynamic")

install(TARGETS shadow-input DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})

