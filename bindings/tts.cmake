project(libtts C)
set(ROKIDOS_BINDINGS_DIR ${CMAKE_SOURCE_DIR}/bindings)

add_library(libtts MODULE ${ROKIDOS_BINDINGS_DIR}/tts.c)
set_target_properties(libtts PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "libtts"
  LINK_FLAGS "-rdynamic"
)
target_include_directories(libtts PUBLIC ${SHADOW_NODE_HEADER_PATH})
