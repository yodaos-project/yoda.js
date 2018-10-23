cmake_minimum_required(VERSION 3.0)
project(node-wifi CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-wifi MODULE src/WifiNative.cc)
target_include_directories(node-wifi PRIVATE
  ../../../include
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-wifi iotjs wpa_ctrl)
set_target_properties(node-wifi PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "wifi"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-wifi DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})

