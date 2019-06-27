cmake_minimum_required(VERSION 3.0)
project(yodaos_client_c)

aux_source_directory(src SRC_LIST)
include_directories("./include")

set(HEADER_FILES
    ./include/yodaos_sdk.h
    ./include/yodaos_api_defines.h
    ./include/yodaos_apis.h
)

if(EXISTS "$ENV{STAGING_DIR}")
    include_directories("$ENV{STAGING_DIR}/usr/include/caps/")
endif()
SET(CMAKE_INSTALL_PREFIX ${CMAKE_BINARY_DIR})
if(DEFINED YODAOS_MAKE_IN_CI)
    message("build in ci!!")
    link_libraries(flora-cli caps pthread json-c)
    add_definitions(-DYODAOS_EXPORT -Wall -Wno-unused-parameter)
    include_directories("/usr/include/caps/")
else()
    link_libraries(rlog flora-cli caps pthread json-c rklog)
    add_definitions(-DYODAOS_EXPORT -DUSING_RKLOG -Wall -Wno-unused-parameter)
endif()

add_library(yodaosclient_c SHARED ${SRC_LIST})
add_executable(yodaosclient_c_example ${SRC_LIST} example/example.c)

install(FILES ${HEADER_FILES}
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/usr/include
    PERMISSIONS OWNER_READ OWNER_WRITE GROUP_READ WORLD_READ
)

install(TARGETS yodaosclient_c
    RUNTIME DESTINATION /bin
    LIBRARY DESTINATION /usr/lib
    PUBLIC_HEADER DESTINATION /include
)

install(TARGETS yodaosclient_c_example
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION usr/lib
    PUBLIC_HEADER DESTINATION include
)
