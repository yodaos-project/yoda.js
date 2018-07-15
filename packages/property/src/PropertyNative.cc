#include "PropertyNative.h"
#include <cutils/properties.h>

JS_FUNCTION(GetProperty) {
  jerry_size_t keylen = jerry_get_string_size(jargv[0]);
  char key[keylen];
  
  size_t check = jerry_string_to_char_buffer(jargv[0], (jerry_char_t*)key, keylen);
  IOTJS_ASSERT(check == keylen);
  key[keylen] = '\0';

  char val[PROP_VALUE_MAX];
  property_get(key, (char*)&val, "");
  return jerry_create_string((const jerry_char_t*)val);
}

JS_FUNCTION(SetProperty) {
  jerry_size_t keylen = jerry_get_string_size(jargv[0]);
  jerry_size_t vallen = jerry_get_string_size(jargv[1]);
  if (vallen > PROP_VALUE_MAX)
    vallen = PROP_VALUE_MAX;

  char key[keylen];
  char val[vallen];

  jerry_string_to_char_buffer(jargv[0], (jerry_char_t*)key, keylen);
  key[keylen] = '\0';
  jerry_string_to_char_buffer(jargv[1], (jerry_char_t*)val, vallen);
  val[vallen] = '\0';
  property_set((char*)&key, (char*)&val);
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "get", GetProperty);
  iotjs_jval_set_method(exports, "set", SetProperty);
}

NODE_MODULE(volume, init)

