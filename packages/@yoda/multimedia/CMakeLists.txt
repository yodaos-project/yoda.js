cmake_minimum_required(VERSION 3.0)
project(node-multimedia CXX)
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fpermissive")

find_package(NodeAddon REQUIRED)

node_addon_find_package(rklog SHARED REAUIRED
  HEADERS rklog/RKLog.h
  ARCHIVES rklog
)

node_addon_find_package(rplayer SHARED REQUIRED
  HEADERS librplayer/WavPlayer.h librplayer/MediaPlayer.h
  ARCHIVES wavplayer rplayer
)

add_node_addon(mediaplayer SOURCES src/media-player.cc)
target_link_libraries(mediaplayer rplayer::rplayer rklog::rklog)

add_node_addon(wavplayer SOURCES src/wav-player.cc)
target_link_libraries(wavplayer rplayer::wavplayer)

install(TARGETS mediaplayer wavplayer DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js mediaplayer.js sounder.js DESTINATION ${CMAKE_INSTALL_DIR})
