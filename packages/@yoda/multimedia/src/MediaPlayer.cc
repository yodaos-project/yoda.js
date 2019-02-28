#include "MediaPlayer.h"

// cppcheck-suppress unusedFunction
void MultimediaListener::notify(int type, int ext1, int ext2, int from) {
  printf("got event %d thread %d\n", type, from);
  if (type == MEDIA_PREPARED) {
    this->prepared = true;
  }
  if (this->prepared || type == MEDIA_ERROR) {
    // only if prepared or event is MEDIA_ERROR, enables the notify
    uv_async_t* async_handle = new uv_async_t;
    iotjs_player_event_t* event = new iotjs_player_event_t;
    event->player = this->getPlayer();
    event->type = type;
    event->ext1 = ext1;
    event->ext2 = ext2;
    event->from = from;
    async_handle->data = (void*)event;
    uv_async_init(uv_default_loop(), async_handle,
                  MultimediaListener::DoNotify);
    uv_async_send(async_handle);
  }
}

void MultimediaListener::DoNotify(uv_async_t* handle) {
  iotjs_player_event_t* event = (iotjs_player_event_t*)handle->data;
  iotjs_player_t* player_wrap = event->player;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player_wrap);

  jerry_value_t jthis = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_value_t notifyFn;
  fprintf(stdout, "try to notify the event type %d\n", event->type);

  if (event->type == MEDIA_PREPARED) {
    notifyFn = iotjs_jval_get_property(jthis, "onprepared");
  } else if (event->type == MEDIA_PLAYBACK_COMPLETE) {
    notifyFn = iotjs_jval_get_property(jthis, "onplaybackcomplete");
  } else if (event->type == MEDIA_BUFFERING_UPDATE) {
    notifyFn = iotjs_jval_get_property(jthis, "onbufferingupdate");
  } else if (event->type == MEDIA_SEEK_COMPLETE) {
    notifyFn = iotjs_jval_get_property(jthis, "onseekcomplete");
  } else if (event->type == MEDIA_PLAYING_STATUS) {
    notifyFn = iotjs_jval_get_property(jthis, "onplayingstatus");
  } else if (event->type == MEDIA_BLOCK_PAUSE_MODE) {
    notifyFn = iotjs_jval_get_property(jthis, "onblockpausemode");
  } else if (event->type == MEDIA_ERROR) {
    fprintf(stderr, "[jsruntime] player occurrs an error %d %d %d", event->ext1,
            event->ext2, event->from);
    notifyFn = iotjs_jval_get_property(jthis, "onerror");
  } else {
    fprintf(stdout, "unhandled media event type: %d\n", event->type);
    goto clean;
  }
  if (!jerry_value_is_function(notifyFn)) {
    fprintf(stderr, "no function is registered\n");
    goto clean;
  }

  iotjs_jargs_t jargs = iotjs_jargs_create(2);
  iotjs_jargs_append_number(&jargs, event->ext1);
  iotjs_jargs_append_number(&jargs, event->ext2);

  iotjs_make_callback(notifyFn, jerry_create_undefined(), &jargs);
  iotjs_jargs_destroy(&jargs);
  jerry_release_value(notifyFn);

clean:
  delete event;
  uv_close((uv_handle_t*)handle, MultimediaListener::AfterNotify);
}

void MultimediaListener::AfterNotify(uv_handle_t* handle) {
  delete handle;
}

bool MultimediaListener::isPrepared() {
  return this->prepared;
}

iotjs_player_t* MultimediaListener::getPlayer() {
  return this->player;
}

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_player_destroy
};

static void iotjs_player_async_onclose(uv_handle_t* handle) {
  iotjs_player_t* player_wrap = (iotjs_player_t*)handle->data;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player_wrap);
  jerry_value_t jval = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_release_value(jval);
}

static iotjs_player_t* iotjs_player_create(jerry_value_t jplayer) {
  iotjs_player_t* player_wrap = IOTJS_ALLOC(iotjs_player_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_player_t, player_wrap);

  static uint32_t global_id = 1000;
  jerry_value_t jobjectref =
      jerry_acquire_value(jplayer); // TODO: find someway to release this
  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jobjectref,
                               &this_module_native_info);
  _this->handle = NULL;
  _this->listener = new MultimediaListener(player_wrap);
  _this->id = (global_id++);

  _this->close_handle.data = (void*)player_wrap;
  uv_async_init(uv_default_loop(), &_this->close_handle, iotjs_player_onclose);
  return player_wrap;
}

static void iotjs_player_destroy(iotjs_player_t* player_wrap) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_player_t, player_wrap);
  delete _this->handle;
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(player_wrap);
}

static void iotjs_player_onclose(uv_async_t* handle) {
  uv_close((uv_handle_t*)handle, iotjs_player_async_onclose);
}

JS_FUNCTION(Player) {
  DJS_CHECK_THIS();

  const jerry_value_t jplayer = JS_GET_THIS();
  iotjs_player_t* player_wrap = iotjs_player_create(jplayer);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player_wrap);

  jerry_value_t jtag = jargv[0];
  if (!jerry_value_is_string(jtag)) {
    _this->handle = new MediaPlayer(NULL, 5 /** s */, true);
    _this->handle->enableCacheMode(true);
  } else {
    jerry_size_t size = jerry_get_string_size(jtag);
    char* tag = iotjs_buffer_allocate(size + 1);
    jerry_string_to_char_buffer(jtag, (jerry_char_t*)tag, size);
    tag[size] = '\0';
    _this->handle = new MediaPlayer(tag, 5 /** s */, true);
    _this->handle->enableCacheMode(true);
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
  return jerry_create_undefined();
}

JS_FUNCTION(Start) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->listener->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  _this->handle->start();
  return jerry_create_undefined();
}

JS_FUNCTION(Stop) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");

  _this->handle->stop();
  uv_async_send(&_this->close_handle);
  return jerry_create_undefined();
}

JS_FUNCTION(Pause) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->listener->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  _this->handle->pause();
  return jerry_create_undefined();
}

JS_FUNCTION(Resume) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->listener->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  _this->handle->resume();
  return jerry_create_undefined();
}

JS_FUNCTION(Seek) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle == NULL)
    return JS_CREATE_ERROR(COMMON, "player native handle is not initialized");
  if (!_this->listener->isPrepared())
    return JS_CREATE_ERROR(COMMON, "player is not prepared");

  int ms = JS_GET_ARG(0, number);
  _this->handle->seekTo(ms);
  return jerry_create_undefined();
}

JS_FUNCTION(Reset) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  // FIXME(Yorkie): reset needs forcily to reset without any errors.
  if (_this->handle) {
    _this->handle->reset();
  }
  return jerry_create_undefined();
}

JS_FUNCTION(EqModeGetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  int mode = 0;
  if (_this->handle) {
    _this->handle->getCurEqMode((rk_eq_type_t*)&mode);
  }
  return jerry_create_number(mode);
}

JS_FUNCTION(EqModeSetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  int type = JS_GET_ARG(0, number);
  if (_this->handle) {
    _this->handle->setEqMode((rk_eq_type_t)type);
  }
  return jerry_create_undefined();
}

JS_FUNCTION(SetTempoDelta) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  float delta = JS_GET_ARG(0, number);
  if (_this->handle) {
    _this->handle->setTempoDelta(delta);
  }
  return jerry_create_undefined();
}

JS_FUNCTION(IdGetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);
  return jerry_create_number(_this->id);
}

JS_FUNCTION(PlayingStateGetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle && _this->listener->isPrepared())
    return jerry_create_boolean(_this->handle->isPlaying());
  else
    return jerry_create_boolean(false);
}

JS_FUNCTION(DurationGetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  int ms = -1;
  if (_this->handle && _this->listener->isPrepared()) {
    _this->handle->getDuration(&ms);
  }
  return jerry_create_number(ms);
}

JS_FUNCTION(PositionGetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  int ms = -1;
  if (_this->handle && _this->listener->isPrepared()) {
    _this->handle->getCurrentPosition(&ms);
  }
  return jerry_create_number(ms);
}

JS_FUNCTION(LoopModeGetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle && _this->listener->isPrepared()) {
    return jerry_create_boolean(_this->handle->isLooping());
  } else {
    return jerry_create_boolean(false);
  }
}

JS_FUNCTION(LoopModeSetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  bool mode = JS_GET_ARG(0, boolean);
  if (_this->handle) {
    _this->handle->setLooping(mode);
    return jerry_create_boolean(true);
  } else {
    return JS_CREATE_ERROR(COMMON, "player is not ready");
  }
}

JS_FUNCTION(SessionIdGetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  if (_this->handle) {
    return jerry_create_boolean(_this->handle->getAudioSessionId());
  } else {
    return JS_CREATE_ERROR(COMMON, "player is not ready");
  }
}

JS_FUNCTION(SessionIdSetter) {
  JS_DECLARE_THIS_PTR(player, player);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_player_t, player);

  int id = JS_GET_ARG(0, number);
  if (_this->handle) {
    _this->handle->setAudioSessionId(id);
    return jerry_create_boolean(true);
  } else {
    return JS_CREATE_ERROR(COMMON, "player is not ready");
  }
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
  iotjs_jval_set_method(proto, "seek", Seek);
  iotjs_jval_set_method(proto, "reset", Reset);
  iotjs_jval_set_method(proto, "setTempoDelta", SetTempoDelta);

  // the following methods are for getters and setters internally
  iotjs_jval_set_method(proto, "idGetter", IdGetter);
  iotjs_jval_set_method(proto, "playingStateGetter", PlayingStateGetter);
  iotjs_jval_set_method(proto, "durationGetter", DurationGetter);
  iotjs_jval_set_method(proto, "positionGetter", PositionGetter);
  iotjs_jval_set_method(proto, "loopModeGetter", LoopModeGetter);
  iotjs_jval_set_method(proto, "loopModeSetter", LoopModeSetter);
  iotjs_jval_set_method(proto, "sessionIdGetter", SessionIdGetter);
  iotjs_jval_set_method(proto, "sessionIdSetter", SessionIdSetter);
  iotjs_jval_set_method(proto, "eqModeGetter", EqModeGetter);
  iotjs_jval_set_method(proto, "eqModeSetter", EqModeSetter);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(MediaPlayer, init)
