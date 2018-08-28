cmake_minimum_required(VERSION 3.0)
project(shadow-audio CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(shadow-audio MODULE src/AudioNative.cc)
target_include_directories(shadow-audio PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(shadow-audio iotjs rkvolumecontrol)
set_target_properties(shadow-audio PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "audio"
  LINK_FLAGS "-rdynamic")

install(TARGETS shadow-audio DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})

