cmake_minimum_required(VERSION 2.8)

set(YODA_API_OUTPUT "./runtime/client/api/default.json")
file(GLOB YODA_DESCRIPTOR_FILES ./runtime/descriptor/*.js)
add_custom_target(yodart-api ALL node tools/generate-api-json.js
  SOURCES ${YODA_DESCRIPTOR_FILES}
)

install(FILES ${YODA_API_OUTPUT} DESTINATION /usr/yoda/client/api)
