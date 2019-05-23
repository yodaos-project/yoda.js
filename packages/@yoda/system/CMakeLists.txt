cmake_minimum_required(VERSION 3.0)
project(node-system CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-system MODULE src/SystemNative.cc)
if(CMAKE_BUILD_HOST)
  target_compile_definitions(node-system PRIVATE BUILD_HOST)
endif()

target_include_directories(node-system PRIVATE
  ../../../include
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)
if(NOT CMAKE_BUILD_HOST)
  target_link_libraries(node-system iotjs recovery)
endif()
set_target_properties(node-system PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "system"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-system DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})
