#include "AudioNative.h"
#include <vol_ctrl/volumecontrol.h>

static inline 
rk_stream_type_t iotjs_audiomgr_get_stream_type(int stream) {
  if (stream == STREAM_TTS) {
    return STREAM_TTS;
  } else if (stream == STREAM_ALARM) {
    return STREAM_ALARM;
  } else if (stream == STREAM_PLAYBACK) {
    return STREAM_PLAYBACK;
  } else if (stream == STREAM_SYSTEM) {
    return STREAM_SYSTEM;
  } else {
    return STREAM_AUDIO;
  }
}

JS_FUNCTION(SetMediaVolume) {
  int vol = JS_GET_ARG(0, number);
  rk_set_volume(vol);
  return jerry_create_boolean(true);
}

JS_FUNCTION(GetMediaVolume) {
  int vol = rk_get_volume();
  return jerry_create_number(vol);
}

JS_FUNCTION(SetStreamVolume) {
  int stream = JS_GET_ARG(0, number);
  int vol = JS_GET_ARG(1, number);
  rk_stream_type_t type = iotjs_audiomgr_get_stream_type(stream);
  rk_set_stream_volume(type, vol);
  return jerry_create_boolean(true);
}

JS_FUNCTION(GetStreamVolume) {
  int stream = JS_GET_ARG(0, number);
  rk_stream_type_t type = iotjs_audiomgr_get_stream_type(stream);
  int vol = rk_get_stream_volume(type);
  return jerry_create_number(vol);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "setMediaVolume", SetMediaVolume);
  iotjs_jval_set_method(exports, "getMediaVolume", GetMediaVolume);
  iotjs_jval_set_method(exports, "setStreamVolume", SetStreamVolume);
  iotjs_jval_set_method(exports, "getStreamVolume", GetStreamVolume);

#define IOTJS_SET_CONSTANT(jobj, name) do {                             \
  jerry_value_t jkey = jerry_create_string((const jerry_char_t*)#name); \
  jerry_value_t jval = jerry_create_number(name);                       \
  jerry_set_property(jobj, jkey, jval);                                 \
  jerry_release_value(jkey);                                            \
  jerry_release_value(jval);                                            \
} while (0)

  IOTJS_SET_CONSTANT(exports, STREAM_AUDIO);
  IOTJS_SET_CONSTANT(exports, STREAM_TTS);
  IOTJS_SET_CONSTANT(exports, STREAM_ALARM);
  IOTJS_SET_CONSTANT(exports, STREAM_PLAYBACK);
  IOTJS_SET_CONSTANT(exports, STREAM_SYSTEM);
#undef IOTJS_SET_CONSTANT
}

NODE_MODULE(volume, init)

