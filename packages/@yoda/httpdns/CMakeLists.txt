cmake_minimum_required(VERSION 2.8.12)
project(node-httpdns)

add_definitions(-std=c++11)

add_library(node-httpdns MODULE ${RESCLIENT_CPP_SRC} src/httpdns.cc)
include_directories(
  ../../../include
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)
set_target_properties(node-httpdns PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    OUTPUT_NAME "httpdns"
    LINK_FLAGS "-rdynamic")

target_link_libraries(node-httpdns iotjs httpdns)

install(TARGETS node-httpdns DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})
