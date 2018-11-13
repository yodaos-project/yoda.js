cmake_minimum_required(VERSION 3.0)
project(yodaos-tts-kit CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB TTSKIT_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${TTSKIT_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
