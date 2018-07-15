#include "MultimediaNative.h"
#include <uv.h>

void MultimediaListener::notify(int msg, int ext1, int ext2, int from) {
  // TODO
}

bool MultimediaListener::isPrepared() {
  return this->prepared;
}

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_player_destroy
};

static iotjs_player_t* iotjs_player_create(jerry_value_t jplayer) {
  iotjs_player_t* player_wrap = IOTJS_ALLOC(iotjs_player_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_player_t, player_wrap);

  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jplayer, &this_module_native_info);
  _this->handle = NULL;
  _this->listener = new MultimediaListener();
  return player_wrap;
}

static void iotjs_player_destroy(iotjs_player_t* player_wrap) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_player_t, player_wrap);
  delete _this->handle;
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(player_wrap);
}

JS_FUNCTION(Player) {
  DJS_CHECK_THIS();
  
  const jerry_value_t jplayer = JS_GET_THIS();
  iotjs_player_t* player_wrap = iotjs_player_create(jplayer);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player_wrap);

  jerry_value_t jtag = jargv[0];
  if (!jerry_value_is_string(jtag)) {
    _this->handle = new MediaPlayer(NULL);
  } else {
    jerry_size_t size = jerry_get_string_size(jtag);
    char* tag = iotjs_buffer_allocate(size + 1);
    jerry_string_to_char_buffer(jtag, (jerry_char_t*)tag, size);
    tag[size] = '\0';
    _this->handle = new MediaPlayer(tag);
    iotjs_buffer_release(tag);
  }

  if (_this->listener == NULL)
    return JS_CREATE_ERROR(COMMON, "listener is not initialized");
  _this->handle->setListener(_this->listener);
  return jerry_create_undefined();
}

JS_FUNCTION(Prepare) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");

  jerry_value_t jsource = jargv[0];
  if (!jerry_value_is_string(jsource))
    return JS_CREATE_ERROR(COMMON, "source must be a string");

  jerry_size_t srclen = jerry_get_string_size(jsource);
  char source[srclen];
  jerry_string_to_char_buffer(jsource, (jerry_char_t*)source, srclen);
  source[srclen] = '\0';

  _this->handle->setDataSource(source);
  _this->handle->prepareAsync();
  return JS_GET_THIS();
}

JS_FUNCTION(Start) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->listener->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  _this->handle->start();
  return JS_GET_THIS();
}

JS_FUNCTION(Stop) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->listener->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  _this->handle->stop();
  return JS_GET_THIS();
}

JS_FUNCTION(Pause) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->listener->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  _this->handle->pause();
  return JS_GET_THIS();
}

JS_FUNCTION(Disconnect) {
  JS_DECLARE_THIS_PTR(tts, tts);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, tts);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->handle->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  _this->handle->disconnect();
  return JS_GET_THIS();
}

void init(jerry_value_t exports) {
  jerry_value_t jconstructor = jerry_create_external_function(Player);
  iotjs_jval_set_property_jval(exports, "Player", jconstructor);
  
  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "prepare", Prepare);
  iotjs_jval_set_method(proto, "start", Start);
  iotjs_jval_set_method(proto, "stop", Stop);
  iotjs_jval_set_method(proto, "pause", Pause);
  iotjs_jval_set_method(proto, "resume", Resume);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(tts, init)
