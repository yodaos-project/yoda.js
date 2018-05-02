#include <stdlib.h>
#include <stdio.h>
#include <shadow-node/iotjs.h>
#include <shadow-node/iotjs_def.h>
#include <shadow-node/iotjs_binding.h>
#include <shadow-node/iotjs_objectwrap.h>
#include <tts/tts_client.h>

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  struct tts_callback listeners;
} IOTJS_VALIDATED_STRUCT(iotjs_ttswrap_t);

void onttsstart(int id, void* data) {
  printf("onttsstart\n");
}

void onttscancel(int id, void* data) {
  printf("onttscancel\n");
}

void onttsdone(int id, void* data) {
  printf("onttsdone\n");
}

void onttserror(int id, int err, void* data) {
  printf("onttserror\n");
}

static void iotjs_ttswrap_destroy(iotjs_ttswrap_t* tts);
static JNativeInfoType this_module_native_info = { 
  .free_cb = (void*)iotjs_ttswrap_destroy
};

static iotjs_ttswrap_t* iotjs_ttswrap_create(const jerry_value_t value) {
  iotjs_ttswrap_t* tts = IOTJS_ALLOC(iotjs_ttswrap_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_ttswrap_t, tts);
  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, 
                               value,
                               &this_module_native_info);
  
  struct tts_callback listeners = {
    onttsstart,
    onttscancel,
    onttsdone,
    onttserror,
  };
  _this->listeners = listeners;
  int r = tts_init();
  if (r != -1) {
    tts_set(&_this->listeners);
  }
  return tts;
}

static void iotjs_ttswrap_destroy(iotjs_ttswrap_t* tts) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_ttswrap_t, tts);
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(tts);
}

JS_FUNCTION(TtsConstructor) {
  DJS_CHECK_THIS();
  iotjs_ttswrap_create(JS_GET_THIS());
  return jerry_create_undefined();
}

JS_FUNCTION(TtsSay) {
  JS_DECLARE_THIS_PTR(ttswrap, ttswrap);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_ttswrap_t, ttswrap);

  iotjs_string_t jtext = JS_GET_ARG(0, string);
  char* text = iotjs_string_data(&jtext);
  int id = tts_speak(text, (void*)_this);
  return jerry_create_number(id);
}

void InitTts(jerry_value_t exports) {
  jerry_value_t tts = jerry_create_object();
  jerry_value_t ttsConstructor =
      jerry_create_external_function(TtsConstructor);
  iotjs_jval_set_property_jval(tts, "TtsWrap", ttsConstructor);

  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "say", TtsSay);
  iotjs_jval_set_property_jval(ttsConstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(ttsConstructor);
  return tts;
}

NODE_MODULE(libtts, InitTts)