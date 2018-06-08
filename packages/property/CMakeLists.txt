cmake_minimum_required(VERSION 3.0)
project(property_nodejs C)

add_library(property_nodejs MODULE binding.c)
target_include_directories(property_nodejs
  PRIVATE ${CMAKE_INCLUDE_DIR} ${CMAKE_INCLUDE_DIR}/shadow-node)

target_link_libraries(property_nodejs -lproperty -landroid_cutils)
set_target_properties(property_nodejs PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "property"
  LINK_FLAGS "-rdynamic")

install(TARGETS property_nodejs DESTINATION ${CMAKE_INSTALL_DIR})