cmake_minimum_required(VERSION 3.0)
project(volume_nodejs C)

add_library(volume_nodejs MODULE binding)
target_include_directories(volume_nodejs
  PRIVATE ${CMAKE_INCLUDE_DIR} ${CMAKE_INCLUDE_DIR}/shadow-node)

target_link_libraries(volume_nodejs -lrecovery)
set_target_properties(volume_nodejs PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "recovery"
  LINK_FLAGS "-rdynamic")

install(TARGETS volume_nodejs DESTINATION ${CMAKE_INSTALL_DIR})