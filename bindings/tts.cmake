cmake_minimum_required(VERSION 2.8.12)

project(libtts C)
add_library(libtts MODULE tts.c)
set_target_properties(libtts PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "binding"
  LINK_FLAGS "-undefined dynamic_lookup"
)
target_include_directories(libtts PUBLIC ${SHADOW_NODE_HEADER_PATH})
