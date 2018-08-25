#include "SpeechNative.h"
#include <unistd.h>

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_speech_destroy
};

iotjs_speech_t* iotjs_speech_create(const jerry_value_t jspeech) {
  iotjs_speech_t* speech_wrap = IOTJS_ALLOC(iotjs_speech_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_speech_t, speech_wrap);
  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jspeech,
                               &this_module_native_info);
  return speech_wrap;
}

void iotjs_speech_destroy(iotjs_speech_t* speech_wrap) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_speech_t, speech_wrap);
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(speech_wrap);
}

void* iotjs_speech_poll_event(void* data) {
  SpeechResult res;
  iotjs_speech_t* speech_wrap = (iotjs_speech_t*)data;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech_wrap);

  while (true) {
    if (!_this->speech->poll(res)) {
      fprintf(stderr, "tts poll failed\n");
      break;
    }
    switch (res.type) {
      case SPEECH_RES_END: {
        printf("speech text %s\n", res.nlp);
        break;
      }
      case SPEECH_RES_CANCELLED:
      case SPEECH_RES_ERROR: {
        printf("error\n");
        break;
      }
    }
  }
  _this->speech->release();
  return NULL;
}

JS_FUNCTION(Speech) {
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
      default:
        break;
    }
  }

  fprintf(stdout, "host: %s, port: %d, branch: %s\n", host, port, branch);

  PrepareOptions opts;
  opts.host = host;
  opts.port = port;
  opts.branch = path;
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
  free(declaimer);

  if (r) {
    if (pthread_create(&_this->polling, NULL, iotjs_speech_poll_event, _this)) {
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
  jerry_char_t text_buf[size];
  jerry_string_to_utf8_char_buffer(jargv[0], text_buf, size);
  text_buf[size] = '\0';
  text = (char*)&text_buf;

  int32_t id = _this->speech->put_text(text, NULL);
  return jerry_create_number(id);
}

JS_FUNCTION(Disconnect) {
  JS_DECLARE_THIS_PTR(speech, speech);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_speech_t, speech);

  _this->speech->release();
  pthread_join(_this->polling);
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  jerry_value_t jconstructor = jerry_create_external_function(Speech);
  iotjs_jval_set_property_jval(exports, "SpeechWrap", jconstructor);

  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "prepare", Prepare);
  iotjs_jval_set_method(proto, "putText", PutText);
  iotjs_jval_set_method(proto, "disconnect", Disconnect);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(light, init)
