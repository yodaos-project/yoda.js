cmake_minimum_required(VERSION 3.0)
project(yodart VERSION 8.1.2 LANGUAGES C CXX)
include(ExternalProject)
find_package(Git REQUIRED)

include(cmake/packages.cmake)
include(cmake/yodart.cmake)
include(cmake/yodart-api.cmake)

add_subdirectory(client/c)
