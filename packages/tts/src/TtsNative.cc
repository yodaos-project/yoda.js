#include "TtsNative.h"

TtsNative* tts_native = NULL;

JS_FUNCTION(Prepare) {
  if (tts_native != NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  tts_native->prepare(
    "apigwws.open.rokid.com", 443, "/api",
    "rokid_test_key", // key
    "rokid_test_device_type", // device typeId
    "rokid_test_id",                 // device id
    "rokid_test_secret", // secret
    "rokid");
  return jerry_create_boolean(true);
}

JS_FUNCTION(Speak) {
  if (tts_native != NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  tts_native->speak("hello");
  return jerry_create_boolean(true);
}

JS_FUNCTION(Cancel) {
  if (tts_native != NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  int id = JS_GET_ARG(0, number);
  tts_native->cancel(id);
  return jerry_create_boolean(true);
}

JS_FUNCTION(Disconnect) {
  if (tts_native != NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  tts_native->disconnect();
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  tts_native = new TtsNative();
  iotjs_jval_set_method(exports, "prepare", Prepare);
  iotjs_jval_set_method(exports, "speak", Speak);
}

NODE_MODULE(tts, init)
