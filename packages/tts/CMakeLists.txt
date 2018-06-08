cmake_minimum_required(VERSION 3.0)
project(tts_nodejs C)

add_library(tts_nodejs MODULE binding)
target_include_directories(tts_nodejs
  PRIVATE ${CMAKE_INCLUDE_DIR} ${CMAKE_INCLUDE_DIR}/shadow-node)

target_link_libraries(tts_nodejs -lspeech)
set_target_properties(tts_nodejs PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "recovery"
  LINK_FLAGS "-rdynamic")

install(TARGETS tts_nodejs DESTINATION ${CMAKE_INSTALL_DIR})