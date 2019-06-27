cmake_minimum_required(VERSION 2.8)

set(HOST_NODEJS_BIN node CACHE STRING "nodejs executable path")

set(YODA_API_OUTPUT "./client/js/api/default.json")
file(GLOB YODA_DESCRIPTOR_FILES ./runtime/descriptor/*.js)
add_custom_target(yodart-api ALL ${HOST_NODEJS_BIN} tools/generate-api-json.js
  SOURCES ${YODA_DESCRIPTOR_FILES}
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

install(FILES ${YODA_API_OUTPUT} DESTINATION /usr/yoda/client/api)
