cmake_minimum_required(VERSION 3.0)
project(yodart CXX)
include(ExternalProject)
find_package(Git REQUIRED)

include(cmake/packages.cmake)
include(cmake/yodart.cmake)
include(cmake/yodart-api.cmake)
