cmake_minimum_required(VERSION 3.0)
project(yoda-bluetooth CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB YODA_BLUETOOTH_LIB lib/*.js)
install(FILES index.js ${YODA_BLUETOOTH_LIB} 
  DESTINATION ${CMAKE_INSTALL_DIR})
