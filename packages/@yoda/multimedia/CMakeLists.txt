cmake_minimum_required(VERSION 3.0)
project(node-multimedia CXX)
set(CMAKE_CXX_STANDARD 11)

add_library(node-mediaplayer MODULE
  src/MediaPlayer.cc
)
target_include_directories(node-mediaplayer PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-mediaplayer iotjs rplayer avformat avutil)
set_target_properties(node-mediaplayer PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "mediaplayer"
  LINK_FLAGS "-rdynamic")

add_library(node-wavplayer MODULE src/WavPlayer.cc)
target_include_directories(node-wavplayer PRIVATE
  ../../../include
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
)

target_link_libraries(node-wavplayer iotjs wavplayer )
set_target_properties(node-wavplayer PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "wavplayer"
)

install(TARGETS node-mediaplayer DESTINATION ${CMAKE_INSTALL_DIR})
install(TARGETS node-wavplayer DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js mediaplayer.js sounder.js DESTINATION ${CMAKE_INSTALL_DIR})
