cmake_minimum_required(VERSION 3.0)
project(node-tape CXX)
set(CMAKE_CXX_STANDARD 11)

install(DIRECTORY ./lib DESTINATION ${CMAKE_INSTALL_DIR})
install(DIRECTORY ./bin DESTINATION ${CMAKE_INSTALL_DIR})

install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
