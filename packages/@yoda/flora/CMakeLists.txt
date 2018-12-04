cmake_minimum_required(VERSION 3.0)
project(shadow-flora CXX)
set(CMAKE_CXX_STANDARD 11)


add_library(shadow-flora-cli MODULE
	src/cli-native.cc
	src/cli-native.h
)

if (BUILD_INDEPENDENT)
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
	SHARED_LIBS caps
)
findPackage(flora REQUIRED
	HINTS ${floraPrefix}
	HEADERS flora-cli.h
	SHARED_LIBS flora-cli
)
findPackage(iotjs REQUIRED
	HINTS ${iotjsPrefix}
	HEADERS iotjs.h
	INC_PATH_SUFFIX include/shadow-node
	SHARED_LIBS iotjs
)
findPackage(napi REQUIRED
  HINTS ${napiPrefix}
  HEADERS napi.h napi-inl.h
)
target_include_directories(shadow-flora-cli PRIVATE
	${mutils_INCLUDE_DIRS}
	${flora_INCLUDE_DIRS}
	${iotjs_INCLUDE_DIRS}
	${napi_INCLUDE_DIRS}
)
target_link_libraries(shadow-flora-cli
	${mutils_LIBRARIES}
	${flora_LIBRARIES}
	${iotjs_LIBRARIES}
)
install(TARGETS shadow-flora-cli DESTINATION lib/node_modules/@yoda/flora)
install(FILES index.js comp.js DESTINATION lib/node_modules/@yoda/flora)
else(BUILD_INDEPENDENT)
target_include_directories(shadow-flora-cli PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/shadow-node
  ${CMAKE_INCLUDE_DIR}/usr/include/caps
  ${JSRUNTIME_SOURCE_DIR}/include
)
target_link_libraries(shadow-flora-cli iotjs flora-cli caps)

install(TARGETS shadow-flora-cli DESTINATION ${CMAKE_INSTALL_DIR})
install(FILES index.js comp.js DESTINATION ${CMAKE_INSTALL_DIR})
endif(BUILD_INDEPENDENT)

target_compile_options(shadow-flora-cli PRIVATE
  -DNODE_ADDON_API_DISABLE_DEPRECATED
)
set_target_properties(shadow-flora-cli PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "flora-cli"
  LINK_FLAGS "-rdynamic")
