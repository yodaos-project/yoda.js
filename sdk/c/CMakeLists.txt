cmake_minimum_required(VERSION 3.0)
project(yodaclient-c)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -I..   -Iinclude -I ../include -std=c++11 -O2 -g -DADB_HOST=0 -Wall -Wno-unused-parameter -lrt -D_XOPEN_SOURCE -D_GNU_SOURCE -lpthread")

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -I..   -Iinclude -I ../include -O2 -g -DADB_HOST=0 -Wall -Wno-unused-parameter -lrt -D_XOPEN_SOURCE -D_GNU_SOURCE -lpthread")

aux_source_directory(src SRC_LIST)
include_directories("./include")
include(./common.mk)

set(HEADER_FILES
    ./include/ydc-sdk.h
    ./include/ydc-APIBase.h
    ./include/ydc-APIName.h
)

findPackage(mutils REQUIRED
	HINTS ${mutilsPrefix}
	HEADERS rlog.h caps.h clargs.h
	INC_PATH_SUFFIX include/log include/caps include/misc
	SHARED_LIBS rlog caps
)

findPackage(flora REQUIRED
	HINTS ${floraPrefix}
	HEADERS flora-cli.h
	SHARED_LIBS flora-cli
)

link_libraries(     ${mutils_LIBRARIES}
     ${flora_LIBRARIES}
	 pthread json-c uv cjson rklog)
include_directories(     ${mutils_INCLUDE_DIRS}
     ${flora_INCLUDE_DIRS})

add_definitions(-DYDC_EXPORT)
add_library(yodaclient_c SHARED ${SRC_LIST})
add_executable(yodaclient_c_test ${SRC_LIST} test/test.c)

install(FILES ${HEADER_FILES}
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/yodaclient_c
    PERMISSIONS OWNER_READ OWNER_WRITE GROUP_READ WORLD_READ
)

install(TARGETS yodaclient_c
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    PUBLIC_HEADER DESTINATION include
)

install(TARGETS yodaclient_c_test
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    PUBLIC_HEADER DESTINATION include
)
