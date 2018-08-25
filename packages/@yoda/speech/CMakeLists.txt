cmake_minimum_required(VERSION 3.0)
project(shadow-speech CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(shadow-speech MODULE src/SpeechNative.cc)
target_include_directories(shadow-speech PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(shadow-speech iotjs speech)
set_target_properties(shadow-speech PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "speech"
  LINK_FLAGS "-rdynamic")

install(TARGETS shadow-speech DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})

