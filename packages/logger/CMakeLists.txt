cmake_minimum_required(VERSION 3.0)
project(node-logger CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-logger MODULE binding.cc)
target_include_directories(node-logger PRIVATE
  ../../include
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-logger iotjs rklog)
set_target_properties(node-logger PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "logger"
)

install(TARGETS node-logger DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})
