cmake_minimum_required(VERSION 3.0)
project(shadow-flora CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(shadow-flora-cli MODULE
	src/cli-native.cc
	src/cli-native.h
)
target_include_directories(shadow-flora-cli PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
  ${CMAKE_INCLUDE_DIR}/usr/include/caps
)

target_link_libraries(shadow-flora-cli iotjs flora-cli caps)
target_compile_options(shadow-flora-cli PRIVATE
  -DNODE_ADDON_API_DISABLE_DEPRECATED
)
set_target_properties(shadow-flora-cli PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "flora-cli"
  LINK_FLAGS "-rdynamic")

install(TARGETS shadow-flora-cli DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js comp.js DESTINATION ${CMAKE_INSTALL_DIR})
