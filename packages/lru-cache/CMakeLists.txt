cmake_minimum_required(VERSION 3.0)
project(lru-cache CXX)
set(CMAKE_CXX_STANDARD 11)

file(GLOB LRU_CACHE_SRC *.js)

install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES ${LRU_CACHE_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
