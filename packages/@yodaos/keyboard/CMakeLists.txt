cmake_minimum_required(VERSION 3.0)
project(yodaos-keyboard CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODAOS_KEYBOARD_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${YODAOS_KEYBOARD_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
