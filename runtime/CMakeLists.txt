cmake_minimum_required(VERSION 3.0)
project(runtime CXX)
set(CMAKE_CXX_STANDARD 11)

install(DIRECTORY ./ DESTINATION ${CMAKE_INSTALL_DIR}/runtime)

