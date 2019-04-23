cmake_minimum_required(VERSION 3.0)
project(yodaos-speech-synthesis CXX)
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fpermissive")

add_library(node-speech-synthesis MODULE
  src/pcm-player.cc
  src/speech-synthesizer.cc
)

set_target_properties(node-speech-synthesis PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "speech-synthesizer")

if (APPLE)
  set_target_properties(node-speech-synthesis PROPERTIES
                        LINK_FLAGS "-rdynamic -undefined dynamic_lookup")
else ()
  set_target_properties(node-speech-synthesis PROPERTIES
                        LINK_FLAGS "-rdynamic -Wl,--unresolved-symbols=ignore-all")
endif ()


if (BUILD_INDEPENDENT)
  option(SEARCH_NODE_HEADERS "search node.js headers" OFF)
  option(BUILD_DEBUG "compile with debug flags" OFF)

  include(${CUSTOM_CMAKE_MODULES}/common.mk)

  if (BUILD_DEBUG)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0")
  else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Os")
    set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -s")
  endif()

  findPackage(mutils REQUIRED
    HINTS ${mutilsPrefix}
    HEADERS caps.h
    INC_PATH_SUFFIX include/caps
    STATIC_LIBS caps rlog misc
  )
  findPackage(flora REQUIRED
    HINTS ${floraPrefix}
    HEADERS flora-cli.h
    STATIC_LIBS flora-cli
  )
  findPackage(pulse REQUIRED
    HINTS ${pulsePrefix}
    HEADERS pulse/simple.h
    SHARED_LIBS pulse pulse-simple
  )
  if(SEARCH_NODE_HEADERS)
    findPackage(iotjs REQUIRED
      HINTS ${iotjsPrefix}
      HEADERS node_api.h
      INC_PATH_SUFFIX "include/node"
    )
  else()
    findPackage(iotjs REQUIRED
      HINTS ${iotjsPrefix}
      HEADERS node_api.h
      INC_PATH_SUFFIX "include/shadow-node"
    )
  endif()
  findPackage(napi REQUIRED
    HINTS ${napiPrefix}
    HEADERS napi.h napi-inl.h
  )
  target_include_directories(node-speech-synthesis PRIVATE
    ${mutils_INCLUDE_DIRS}
    ${flora_INCLUDE_DIRS}
    ${pulse_INCLUDE_DIRS}
    ${iotjs_INCLUDE_DIRS}
    ${napi_INCLUDE_DIRS}
  )
  target_link_libraries(node-speech-synthesis
    ${mutils_LIBRARIES}
    ${flora_LIBRARIES}
    ${pulse_LIBRARIES}
  )
else(BUILD_INDEPENDENT)
  target_include_directories(node-speech-synthesis PRIVATE
    ${CMAKE_INCLUDE_DIR}/include
    ${CMAKE_INCLUDE_DIR}/usr/include
    ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
    ${CMAKE_INCLUDE_DIR}/usr/include/caps
    ${JSRUNTIME_SOURCE_DIR}/include
  )
  target_link_libraries(node-speech-synthesis flora-cli caps pulse pulse-simple)

  install(TARGETS node-speech-synthesis DESTINATION ${CMAKE_INSTALL_DIR}/out)

  file(GLOB SPEECHSYNTHESIS_SRC *.js)
  install(FILES package.json DESTINATION ${CMAKE_INSTALL_DIR})
  install(FILES ${SPEECHSYNTHESIS_SRC} DESTINATION ${CMAKE_INSTALL_DIR})
endif(BUILD_INDEPENDENT)
