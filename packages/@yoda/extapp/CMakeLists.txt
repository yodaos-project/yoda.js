cmake_minimum_required(VERSION 3.0)
project(yoda-extapp CXX)
set(CMAKE_CXX_STANDARD 11)

install(DIRECTORY ./adapter DESTINATION ${CMAKE_INSTALL_DIR})
install(DIRECTORY ./tests DESTINATION ${CMAKE_INSTALL_DIR})

install(FILES index.js service.js DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
