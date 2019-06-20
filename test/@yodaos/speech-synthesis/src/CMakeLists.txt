cmake_minimum_required(VERSION 3.0)
project(voice-interface CXX)
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fpermissive")

find_package(NodeAddon REQUIRED)

add_executable(${PROJECT_NAME} voice-interface.cc)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0")

if(CMAKE_BUILD_HOST)
  node_addon_find_package(mutils SHARED REQUIRED
    HINTS ${mutilsPrefix}
    HEADERS caps.h
    ARCHIVES caps rlog misc
    INC_PATH_SUFFIX caps
  )
  node_addon_find_package(flora-cli SHARED REQUIRED
    HINTS ${floraPrefix}
    HEADERS flora-cli.h
    ARCHIVES flora-cli
  )
  target_link_libraries(${PROJECT_NAME}
    mutils::caps mutils::rlog mutils::misc
    flora-cli::flora-cli pthread
  )
  install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION /usr/bin
    LIBRARY DESTINATION /usr/lib
    PUBLIC_HEADER DESTINATION /usr/include)
else(CMAKE_BUILD_HOST)
  target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_INCLUDE_DIR}/usr/include/caps
  )
  target_link_libraries(${PROJECT_NAME} flora-cli caps)

  install(TARGETS ${PROJECT_NAME} DESTINATION ${CMAKE_INSTALL_DIR}/out)
endif(CMAKE_BUILD_HOST)
