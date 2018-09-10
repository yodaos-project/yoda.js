#include "SpeechNative.h"
#include <unistd.h>

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_speech_destroy
};

iotjs_speech_t* iotjs_speech_create(const jerry_value_t jspeech) {
  iotjs_speech_t* speech_wrap = IOTJS_ALLOC(iotjs_speech_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_speech_t, speech_wrap);
  jerry_value_t jspeechref = jerry_acquire_value(jspeech);
  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jspeechref,
                               &this_module_native_info);
  _this->has_error = false;
  return speech_wrap;
}

void iotjs_speech_destroy(iotjs_speech_t* speech_wrap) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_speech_t, speech_wrap);
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  _this->speech->release();
  if (_this->stack != NULL) {
    free(_this->stack);
  }
  if (_this->skillOption != NULL) {
    free(_this->skillOption);
  }
  IOTJS_RELEASE(speech_wrap);
}

void iotjs_speech_onresult(uv_async_t* handle) {
  iotjs_speech_t* speech_wrap = (iotjs_speech_t*)handle->data;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech_wrap);

  jerry_value_t jthis = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_value_t onresult = iotjs_jval_get_property(jthis, "onresult");
  if (!jerry_value_is_function(onresult)) {
    fprintf(stderr, "no onresult handler is registered\n");
    return;
  }

  if (_this->has_error) {
    jerry_value_t jargv[0] = {};
    jerry_call_function(onresult, jerry_create_undefined(), jargv, 0);
  } else {
    uint32_t jargc = 2;
    jerry_value_t nlp = jerry_create_string((const jerry_char_t*)_this->nlp);
    jerry_value_t action = jerry_create_string((const jerry_char_t*)_this->action);
    jerry_value_t jargv[jargc] = { nlp, action };
    jerry_call_function(onresult, jerry_create_undefined(), jargv, jargc);

    // release strings
    jerry_release_value(nlp);
    jerry_release_value(action);
    if (_this->nlp != NULL)
      free(_this->nlp);
    if (_this->action != NULL)
      free(_this->action);
  }
  jerry_release_value(onresult);
}

void* iotjs_speech_poll_event(void* data) {
  SpeechResult result;
  iotjs_speech_t* speech = (iotjs_speech_t*)data;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech);

  while (true) {
    bool need_send = false;
    if (!_this->speech->poll(result))
      break;
    if (result.type == SPEECH_RES_CANCELLED ||
      result.type == SPEECH_RES_ERROR) {
      _this->has_error = true;
      need_send = true;
    } else if (result.type == SPEECH_RES_END) {
      _this->has_error = false;
      _this->nlp = strdup(result.nlp.c_str());
      _this->action = strdup(result.action.c_str());
      need_send = true;
    }

    if (need_send) {
      uv_async_init(uv_default_loop(), &_this->async, iotjs_speech_onresult);
      _this->async.data = (void*)speech;
      uv_async_send(&_this->async);
    }
  }
  return NULL;
}

JS_FUNCTION(SPEECH) {
  DJS_CHECK_THIS();
  const jerry_value_t jspeech = JS_GET_THIS();
  iotjs_speech_t* speech = iotjs_speech_create(jspeech);
  return jerry_create_undefined();
}

JS_FUNCTION(Prepare) {
  JS_DECLARE_THIS_PTR(speech, speech);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech);

  if (_this->prepared == true) {
    return JS_CREATE_ERROR(COMMON, "instance has been prepared already");
  }

  char* host;
  int port;
  char* branch;
  char* key;
  char* device_type;
  char* device_id;
  char* secret;

  port = (int)JS_GET_ARG(1, number);
  for (int i = 0; i < 7; i++) {
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
      default:
        break;
    }
  }
  fprintf(stdout, "host: %s, port: %d, branch: %s\n", host, port, branch);

  PrepareOptions opts;
  opts.host = host;
  opts.port = port;
  opts.branch = branch;
  opts.key = key;
  opts.secret = secret;
  opts.device_type_id = device_type;
  opts.device_id = device_id;
  _this->speech = Speech::new_instance();
  bool r = _this->speech->prepare(opts);

  // free strings
  free(host);
  free(branch);
  free(key);
  free(device_type);
  free(device_id);
  free(secret);

  if (r) {
    if (pthread_create(&_this->polling, NULL, iotjs_speech_poll_event, speech)) {
      goto terminate;
    }
    pthread_detach(_this->polling);
    _this->prepared = true;
    return jerry_create_boolean(true);
  } else {
    goto terminate;
  }

terminate:
  if (_this->speech) {
    _this->speech->release();
  }
  return jerry_create_boolean(false);
}

JS_FUNCTION(PutText) {
  JS_DECLARE_THIS_PTR(speech, speech);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech);

  if (_this->speech == NULL)
    return JS_CREATE_ERROR(COMMON, "speech is not initialized");
  if (jargc == 0)
    return JS_CREATE_ERROR(COMMON, "first argument should be a string");

  char* text = NULL;
  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t text_buf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], text_buf, size);
  text_buf[size] = '\0';
  text = (char*)&text_buf;

  VoiceOptions* voiceOptions = new VoiceOptions();
  if (_this->stack != NULL) {
    voiceOptions->stack = _this->stack;
  }
  if (_this->skillOption != NULL) {
    voiceOptions->skill_options = _this->skillOption;
  }
  int32_t id = _this->speech->put_text(text, voiceOptions);
  // int32_t id = _this->speech->put_text(text,NULL);
  if (_this->stack != NULL) {
    free(_this->stack);
    _this->stack = NULL;
  }
  if (_this->skillOption != NULL) {
    free(_this->skillOption);
    _this->skillOption = NULL;
  }
  free(voiceOptions);
  return jerry_create_number(id);
}

JS_FUNCTION(Release) {
  JS_DECLARE_THIS_PTR(speech, speech);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech);

  if (_this->speech == NULL)
    return JS_CREATE_ERROR(COMMON, "speech is not initialized");

  pthread_join(_this->polling, NULL);
  jerry_value_t this_obj = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_release_value(this_obj);
  return jerry_create_undefined();
}

JS_FUNCTION(SetStack) {
  JS_DECLARE_THIS_PTR(speech, speech);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech);

  if (_this->speech == NULL) {
    return JS_CREATE_ERROR(COMMON, "speech is not initialized");
  }
  if (_this->stack != NULL) {
    free(_this->stack);
    _this->stack = NULL;
  }
  char* text = NULL;
  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t text_buf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], text_buf, size);
  text_buf[size] = '\0';
  text = (char*)&text_buf;
  _this->stack = strdup(text);
  return jerry_create_number(0);
}

JS_FUNCTION(SetSkillOption) {
  JS_DECLARE_THIS_PTR(speech, speech);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech);
  if (_this->speech == NULL) {
    return JS_CREATE_ERROR(COMMON,"speech is not initialized");
  }
  if (_this->skillOption != NULL) {
    free(_this->skillOption);
    _this->skillOption = NULL;
  }
  char* text = NULL;
  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t text_buf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0],text_buf,size);
  text_buf[size] = '\0';
  text = (char*)&text_buf;
  _this->skillOption = strdup(text);
  return jerry_create_number(0);
}

void init(jerry_value_t exports) {
  jerry_value_t jconstructor = jerry_create_external_function(SPEECH);
  iotjs_jval_set_property_jval(exports, "SpeechWrap", jconstructor);

  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "prepare", Prepare);
  iotjs_jval_set_method(proto, "putText", PutText);
  iotjs_jval_set_method(proto, "release", Release);
  iotjs_jval_set_method(proto, "setStack", SetStack);
  iotjs_jval_set_method(proto, "setSkillOption", SetSkillOption);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(light, init)
