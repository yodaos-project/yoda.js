cmake_minimum_required(VERSION 2.8)

set(YODA_API_OUTPUT "./runtime/client/api/default.json")
file(GLOB YODA_DESCRIPTOR_FILES ./runtime/descriptor/*.js)
add_custom_command(
  OUTPUT ${YODA_API_OUTPUT}
  COMMAND node ARGS tools/generate-api-json.js
)

install(FILES ${YODA_API_OUTPUT} DESTINATION /usr/yoda/client/api)
