cmake_minimum_required(VERSION 3.0)
project(node-tts CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-tts MODULE
  src/TtsNative.cc
  src/TtsService.cc
)
target_include_directories(node-tts PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-tts iotjs pthread speech opusplayer pulse-simple)
set_target_properties(node-tts PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "tts"
  LINK_FLAGS "-rdynamic")

install(TARGETS node-tts DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})
