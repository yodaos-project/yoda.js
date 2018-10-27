cmake_minimum_required(VERSION 2.8.12)
project(node-httpsession)

add_definitions(-std=c++11)

add_library(node-httpsession MODULE ${RESCLIENT_CPP_SRC} src/httpsession.cc)
include_directories(
  ../../../include
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
  /usr/local/include/shadow-node
)
set_target_properties(node-httpsession PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    OUTPUT_NAME "httpsession"
    LINK_FLAGS "-rdynamic")

target_link_libraries(node-httpsession iotjs httpsession)

install(TARGETS node-httpsession DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})
