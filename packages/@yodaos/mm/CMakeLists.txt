cmake_minimum_required(VERSION 3.0)
project(yodaos-mm-kit CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODAOS_MM_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${YODAOS_MM_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
