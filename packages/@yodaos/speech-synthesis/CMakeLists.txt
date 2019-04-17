cmake_minimum_required(VERSION 3.0)
project(yodaos-speech-synthesis-kit CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB SPEECHSYNTHESIS_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${SPEECHSYNTHESIS_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
