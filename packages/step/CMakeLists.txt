cmake_minimum_required(VERSION 3.0)
project(yodaos-step CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB STEP_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${STEP_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
