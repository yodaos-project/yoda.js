cmake_minimum_required(VERSION 3.0)
project(yodaos-storage CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODAOS_STORAGE_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${YODAOS_STORAGE_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
