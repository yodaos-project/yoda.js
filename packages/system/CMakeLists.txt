cmake_minimum_required(VERSION 3.0)
project(system_nodejs C)

add_library(system_nodejs MODULE binding)
target_include_directories(system_nodejs
  PRIVATE ${CMAKE_INCLUDE_DIR} ${CMAKE_INCLUDE_DIR}/shadow-node)

target_link_libraries(system_nodejs -lrecovery)
set_target_properties(system_nodejs PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "recovery"
  LINK_FLAGS "-rdynamic")

install(TARGETS system_nodejs DESTINATION ${CMAKE_INSTALL_DIR})