cmake_minimum_required(VERSION 3.0)
project(node-bluetooth CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-bluetooth MODULE src/BluetoothNative.cc)
target_include_directories(node-bluetooth PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-bluetooth iotjs rokid-bt)
set_target_properties(node-bluetooth PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "bluetooth"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-bluetooth DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})
