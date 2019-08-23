cmake_minimum_required(VERSION 3.0)
project(yodaosclient_c)

aux_source_directory(src SRC_LIST)
include_directories("./include")
set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake/module")
find_package(NodeAddon REQUIRED)

set(HEADER_FILES
    ./include/yodaos_sdk.h
    ./include/yodaos_api_defines.h
    ./include/yodaos_apis.h
)

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

add_library(yodaosclient_c SHARED ${SRC_LIST})

target_link_libraries(yodaosclient_c
  mutils::caps mutils::rlog mutils::misc
  flora-cli::flora-cli
)
add_dependencies(yodaosclient_c yodart-api-c)

SET(CMAKE_INSTALL_PREFIX ${CMAKE_BINARY_DIR})


if(CMAKE_BUILD_HOST)
    target_link_libraries(yodaosclient_c
    mutils::caps mutils::misc flora-cli::flora-cli json-c pthread
    )

    target_compile_definitions(yodaosclient_c PRIVATE -DYODAOS_EXPORT)
else()
    target_link_libraries(yodaosclient_c
    mutils::caps mutils::rlog mutils::misc
    flora-cli::flora-cli json-c pthread
    )

    target_compile_definitions(yodaosclient_c PRIVATE -DYODAOS_EXPORT -DUSING_RKLOG)
endif()

install(FILES ${HEADER_FILES}
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/usr/include
    PERMISSIONS OWNER_READ OWNER_WRITE GROUP_READ WORLD_READ
)

install(TARGETS yodaosclient_c
    RUNTIME DESTINATION /bin
    LIBRARY DESTINATION /usr/lib
    PUBLIC_HEADER DESTINATION /include
)

if(YODAOS_CLIENT_C_BUILD_EXAMPLE)
    add_executable(yodaosclient_c_example ${SRC_LIST} example/example.c)
    target_link_libraries(yodaosclient_c_example
    mutils::caps mutils::rlog mutils::misc
    flora-cli::flora-cli json-c pthread
    )

    target_compile_definitions(yodaosclient_c_example PRIVATE -DYODAOS_EXPORT -DUSING_RKLOG)
    install(TARGETS yodaosclient_c_example
        RUNTIME DESTINATION bin
        LIBRARY DESTINATION usr/lib
        PUBLIC_HEADER DESTINATION include
    )
endif()
