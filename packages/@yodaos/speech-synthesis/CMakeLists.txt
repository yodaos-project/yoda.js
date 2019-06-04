cmake_minimum_required(VERSION 3.0)
project(speech-synthesis CXX)
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fpermissive")

find_package(NodeAddon REQUIRED)

add_node_addon(${PROJECT_NAME} SOURCES src/pcm-player.cc src/speech-synthesizer.cc)

option(BUILD_DEBUG "compile with debug flags" OFF)
if(BUILD_DEBUG)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0")
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Os")
  set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -s")
endif()

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
node_addon_find_package(pulse SHARED REQUIRED
  HINTS ${pulsePrefix}
  HEADERS pulse/simple.h
  ARCHIVES pulse pulse-simple
)
target_link_libraries(${PROJECT_NAME}
  mutils::caps mutils::rlog mutils::misc
  flora-cli::flora-cli
  pulse::pulse pulse::pulse-simple
)

if(CMAKE_BUILD_HOST)
  install(TARGETS ${PROJECT_NAME} DESTINATION out)
  install(FILES package.json DESTINATION ./)
  install(FILES ${SPEECHSYNTHESIS_SRC} DESTINATION ./)
else(CMAKE_BUILD_HOST)
  node_addon_find_package(rklog SHARED REAUIRED
    HEADERS rklog/RKLog.h
    ARCHIVES rklog
  )
  target_link_libraries(${PROJECT_NAME} rklog::rklog)
  target_compile_definitions(${PROJECT_NAME} PRIVATE -DRKLOG_PRESENT)

  install(TARGETS ${PROJECT_NAME} DESTINATION ${CMAKE_INSTALL_DIR}/out)

  file(GLOB SPEECHSYNTHESIS_SRC *.js)
  install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
  install(FILES ${SPEECHSYNTHESIS_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
endif(CMAKE_BUILD_HOST)
