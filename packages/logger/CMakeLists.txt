cmake_minimum_required(VERSION 3.0)
project(node-logger CXX)
set(CMAKE_CXX_STANDARD 11)

#install(TARGETS node-logger DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js DESTINATION ${CMAKE_INSTALL_DIR})

