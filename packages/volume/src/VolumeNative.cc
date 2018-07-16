#include "VolumeNative.h"
#include <vol_ctrl/volumecontrol.h>

static 
inline rk_stream_type_t iotjs_volume_get_stream_type(const char* stream_name) {
  if (stream_name == NULL || !strcmp(stream_name, "audio")) {
    return STREAM_AUDIO;
  } else if (!strcmp(stream_name, "tts")) {
    return STREAM_TTS;
  } else if (!strcmp(stream_name, "alarm")) {
    return STREAM_ALARM;
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
  jerry_value_t size = jerry_get_string_size(jargv[0]);
  jerry_char_t stream_buf[size];
  jerry_string_to_char_buffer(jargv[0], stream_buf, size);

  rk_stream_type_t type = iotjs_volume_get_stream_type((char*)&stream_buf);
  //if (type == -1)
  //  return JS_CREATE_ERROR(COMMON, "invalid stream name, only supports audio, tts or alarm");

  int vol = JS_GET_ARG(1, number);
  rk_set_stream_volume(type, vol);
  return jerry_create_boolean(true);
}

JS_FUNCTION(GetStreamVolume) {
  jerry_value_t size = jerry_get_string_size(jargv[0]);
  jerry_char_t stream_buf[size];
  jerry_string_to_char_buffer(jargv[0], stream_buf, size);

  rk_stream_type_t type = iotjs_volume_get_stream_type((char*)&stream_buf);
  //if (type == -1)
  //  return JS_CREATE_ERROR(COMMON, "invalid stream name, only supports audio, tts or alarm");

  int vol = rk_get_stream_volume(type);
  return jerry_create_number(vol);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "setMediaVolume", SetMediaVolume);
  iotjs_jval_set_method(exports, "getMediaVolume", GetMediaVolume);
  iotjs_jval_set_method(exports, "setStreamVolume", SetStreamVolume);
  iotjs_jval_set_method(exports, "getStreamVolume", GetStreamVolume);
}

NODE_MODULE(volume, init)

