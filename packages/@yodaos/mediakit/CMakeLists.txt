cmake_minimum_required(VERSION 3.0)
project(yodaos-media-kit CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB MEDIAKIT_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${MEDIAKIT_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
