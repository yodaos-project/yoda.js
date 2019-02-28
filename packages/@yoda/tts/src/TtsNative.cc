#include "TtsNative.h"

void TtsNative::SendEvent(void* self, TtsResultType type, int id, int code) {
  TtsNative* native = static_cast<TtsNative*>(self);
  uv_async_t* async_handle = new uv_async_t;
  iotjs_tts_event_t* event = new iotjs_tts_event_t;

  event->ttswrap = native->ttswrap;
  event->type = type;
  event->code = code;
  event->id = id;
  async_handle->data = (void*)event;

  uv_async_init(uv_default_loop(), async_handle, TtsNative::OnEvent);
  uv_async_send(async_handle);
}

void TtsNative::OnEvent(uv_async_t* handle) {
  iotjs_tts_event_t* event = (iotjs_tts_event_t*)handle->data;
  iotjs_tts_t* ttswrap = event->ttswrap;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, ttswrap);

  jerry_value_t jthis = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_value_t onevent = iotjs_jval_get_property(jthis, "onevent");
  if (jerry_value_is_function(onevent)) {
    iotjs_jargs_t jargs = iotjs_jargs_create(3);
    iotjs_jargs_append_number(&jargs, (double)event->type);
    iotjs_jargs_append_number(&jargs, (double)event->id);
    iotjs_jargs_append_number(&jargs, (double)event->code);
    iotjs_make_callback(onevent, jerry_create_undefined(), &jargs);
    iotjs_jargs_destroy(&jargs);
  }
  jerry_release_value(onevent);

  delete event;
  uv_close((uv_handle_t*)handle, TtsNative::AfterEvent);
}

void TtsNative::AfterEvent(uv_handle_t* handle) {
  delete handle;
}

static void iotjs_tts_destroy(iotjs_tts_t* tts) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_tts_t, tts);
  if (_this->handle) {
    delete _this->handle;
    _this->prepared = false;
  }
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(tts);
}

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_tts_destroy
};

static void iotjs_tts_async_onclose(uv_handle_t* handle) {
  iotjs_tts_t* ttswrap = (iotjs_tts_t*)handle->data;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, ttswrap);
  jerry_value_t jval = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_release_value(jval);
}

static void iotjs_tts_onclose(uv_async_t* handle) {
  uv_close((uv_handle_t*)handle, iotjs_tts_async_onclose);
}

static iotjs_tts_t* iotjs_tts_create(jerry_value_t jtts) {
  iotjs_tts_t* ttswrap = IOTJS_ALLOC(iotjs_tts_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_tts_t, ttswrap);

  jerry_value_t jval = jerry_acquire_value(jtts);
  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jval,
                               &this_module_native_info);
  _this->handle = new TtsNative(ttswrap);
  _this->prepared = false;
  _this->close_handle.data = (void*)ttswrap;
  uv_async_init(uv_default_loop(), &_this->close_handle, iotjs_tts_onclose);
  return ttswrap;
}

JS_FUNCTION(TTS) {
  DJS_CHECK_THIS();

  const jerry_value_t jtts = JS_GET_THIS();
  // cppcheck-suppress unreadVariable
  iotjs_tts_t* tts_instance = iotjs_tts_create(jtts);
  return jerry_create_undefined();
}

JS_FUNCTION(Prepare) {
  JS_DECLARE_THIS_PTR(tts, tts);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, tts);

  if (_this->handle == NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  if (_this->prepared == true) {
    return JS_CREATE_ERROR(COMMON, "instance has been prepared already");
  }

  char* host = NULL;
  int port;
  char* branch = NULL;
  char* key;
  char* device_type;
  char* device_id;
  char* secret;
  char* declaimer;
  bool holdconnect;
  port = (int)JS_GET_ARG(1, number);
  holdconnect = JS_GET_ARG(8, boolean);
  for (int i = 0; i < 8; i++) {
    if (i == 1)
      continue;
    jerry_size_t size = jerry_get_string_size(jargv[i]);
    jerry_char_t text_buf[size + 1];
    jerry_string_to_char_buffer(jargv[i], text_buf, size);
    text_buf[size] = '\0';

    switch (i) {
      case 0:
        host = strdup((char*)&text_buf);
        break;
      case 2:
        branch = strdup((char*)&text_buf);
        break;
      case 3:
        key = strdup((char*)&text_buf);
        break;
      case 4:
        device_type = strdup((char*)&text_buf);
        break;
      case 5:
        device_id = strdup((char*)&text_buf);
        break;
      case 6:
        secret = strdup((char*)&text_buf);
        break;
      case 7:
        declaimer = strdup((char*)&text_buf);
        break;
      default:
        break;
    }
  }

  if (host != NULL && branch != NULL) {
    fprintf(stdout, "host: %s, port: %d, branch: %s\n", host, port, branch);
  }
  _this->prepared = true;
  _this->handle->prepare(host, port, branch, key, device_type, device_id,
                         secret, declaimer, holdconnect);

  free(host);
  free(branch);
  free(key);
  free(device_type);
  free(device_id);
  free(secret);
  free(declaimer);
  return jerry_create_boolean(true);
}

JS_FUNCTION(Speak) {
  JS_DECLARE_THIS_PTR(tts, tts);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, tts);

  if (_this->handle == NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  if (jargc == 0) {
    return JS_CREATE_ERROR(COMMON, "first argument should be a string");
  }

  char* text;
  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t text_buf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], text_buf, size);
  text_buf[size] = '\0';
  text = (char*)&text_buf;

  int32_t id = _this->handle->speak(text);
  return jerry_create_number(id);
}

JS_FUNCTION(Cancel) {
  JS_DECLARE_THIS_PTR(tts, tts);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, tts);

  if (_this->handle == NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  int id = JS_GET_ARG(0, number);
  _this->handle->cancel(id);
  return jerry_create_boolean(true);
}

JS_FUNCTION(Disconnect) {
  JS_DECLARE_THIS_PTR(tts, tts);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, tts);

  if (_this->handle == NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  _this->handle->disconnect();
  uv_async_send(&_this->close_handle);
  return jerry_create_boolean(true);
}

JS_FUNCTION(Reconnect) {
  JS_DECLARE_THIS_PTR(tts, tts);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_tts_t, tts);

  if (_this->handle == NULL) {
    return JS_CREATE_ERROR(COMMON, "tts is not initialized");
  }
  _this->handle->reconnect();
  return jerry_create_undefined();
}

void init(jerry_value_t exports) {
  jerry_value_t jconstructor = jerry_create_external_function(TTS);
  iotjs_jval_set_property_jval(exports, "TtsWrap", jconstructor);

  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "prepare", Prepare);
  iotjs_jval_set_method(proto, "speak", Speak);
  iotjs_jval_set_method(proto, "cancel", Cancel);
  iotjs_jval_set_method(proto, "disconnect", Disconnect);
  iotjs_jval_set_method(proto, "reconnect", Reconnect);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(tts, init)
