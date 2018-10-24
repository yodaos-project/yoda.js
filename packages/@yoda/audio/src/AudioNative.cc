#include <node_api.h>
#include <vol_ctrl/volumecontrol.h>
#include <stdio.h>
#include <common.h>
#include <string.h>
static inline rk_stream_type_t get_stream_type(int stream) {
  if (stream == STREAM_TTS) {
    return STREAM_TTS;
  } else if (stream == STREAM_RING) {
    return STREAM_RING;
  } else if (stream == STREAM_VOICE_CALL) {
    return STREAM_VOICE_CALL;
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

static napi_value IsMuted(napi_env env, napi_callback_info info) {
  napi_value index;
  if (rk_is_mute()) {
    napi_get_boolean(env, true, &index);
  } else {
    napi_get_boolean(env, false, &index);
  }
  return index;
}

static napi_value SetMute(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  bool index;
  int rkSetValue;
  napi_status status;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_bool(env, argv[0], &index);
  rkSetValue = rk_set_mute(index);
  napi_create_int32(env, rkSetValue, &returnVal);
  return returnVal;
}


static napi_value SetCurveForVolume(napi_env env, napi_callback_info info) {
  static int curve[101];
  napi_value returnVal;
  int level;
  int vol;
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_int32(env, argv[0], &level);
  napi_get_value_int32(env, argv[1], &vol);
  if (level > 100) {
    napi_get_boolean(env, false, &returnVal);
    return returnVal;
  }
  curve[level] = vol;
  if (level == 100) {
    rk_setCustomVolumeCurve(sizeof(curve), curve);
  }
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}

static napi_value SetMediaVolume(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  int vol;
  napi_value returnVal;
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_int32(env, 0, &vol);
  rk_set_volume(vol);
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}


static napi_value GetMediaVolume(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  int vol = rk_get_volume();
  napi_create_int32(env, vol, &returnVal);
  return returnVal;
}


static napi_value SetStreamVolume(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  int vol;
  int stream;
  napi_value returnVal;
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_int32(env, argv[0], &stream);
  napi_get_value_int32(env, argv[1], &vol);
  rk_stream_type_t type = get_stream_type(stream);
  rk_set_stream_volume(type, vol);
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}


static napi_value GetStreamVolume(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  int stream;
  napi_value argv[1];
  napi_value returnVal;
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_int32(env, argv[0], &stream);
  rk_stream_type_t type = get_stream_type(stream);
  int vol = rk_get_stream_volume(type);
  napi_create_int32(env, vol, &returnVal);
  return returnVal;
}


static napi_value GetStreamPlayingStatus(napi_env env,
                                         napi_callback_info info) {
  size_t argc = 1;
  int stream;
  napi_value argv[1];
  napi_value returnVal;
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_int32(env, argv[0], &stream);
  rk_stream_type_t type = get_stream_type(stream);
  if (rk_get_stream_playing_status(type)) {
    napi_get_boolean(env, true, &returnVal);
  } else {
    napi_get_boolean(env, false, &returnVal);
  }
  return returnVal;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("isMuted", IsMuted),
    DECLARE_NAPI_PROPERTY("setMute", SetMute),
    DECLARE_NAPI_PROPERTY("setCurveForVolume", SetCurveForVolume),
    DECLARE_NAPI_PROPERTY("setMediaVolume", SetMediaVolume),
    DECLARE_NAPI_PROPERTY("getMediaVolume", GetMediaVolume),
    DECLARE_NAPI_PROPERTY("setStreamVolume", SetStreamVolume),
    DECLARE_NAPI_PROPERTY("getStreamVolume", GetStreamVolume),
    DECLARE_NAPI_PROPERTY("getStreamPlayingStatus", GetStreamPlayingStatus)
  };
  napi_define_properties(env, exports, sizeof(desc) / sizeof(*desc), desc);
  NAPI_SET_CONSTANT(exports, STREAM_AUDIO);
  NAPI_SET_CONSTANT(exports, STREAM_TTS);
  NAPI_SET_CONSTANT(exports, STREAM_RING);
  NAPI_SET_CONSTANT(exports, STREAM_VOICE_CALL);
  NAPI_SET_CONSTANT(exports, STREAM_ALARM);
  NAPI_SET_CONSTANT(exports, STREAM_PLAYBACK);
  NAPI_SET_CONSTANT(exports, STREAM_SYSTEM);
  return exports;
}

NAPI_MODULE(AudioNative, Init)
