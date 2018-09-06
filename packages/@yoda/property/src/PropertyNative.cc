#include "PropertyNative.h"
#include <cutils/properties.h>

JS_FUNCTION(GetProperty) {
  if (!jerry_value_is_string(jargv[0]))
    return JS_CREATE_ERROR(COMMON, "key must be a string");

  jerry_size_t keylen = jerry_get_string_size(jargv[0]);
  char key[keylen];

  size_t check =
      jerry_string_to_char_buffer(jargv[0], (jerry_char_t*)key, keylen);
  IOTJS_ASSERT(check == keylen);
  key[keylen] = '\0';

  char val[PROP_VALUE_MAX];
  property_get(key, (char*)&val, "");
  return jerry_create_string((const jerry_char_t*)val);
}

JS_FUNCTION(SetProperty) {
  jerry_value_t jkey = jargv[0];
  jerry_value_t jval = jargv[1];
  if (!jerry_value_is_string(jkey)) {
    return JS_CREATE_ERROR(COMMON, "key must be a string");
  }
  if (!jerry_value_is_string(jval)) {
    jval = jerry_value_to_string(jval);
  }
  jerry_size_t keylen = jerry_get_string_size(jkey);
  jerry_size_t vallen = jerry_get_string_size(jval);

  if (vallen > PROP_VALUE_MAX)
    vallen = PROP_VALUE_MAX;

  char pstr[keylen + 1 + vallen + 1];
  char* key = pstr;
  char* val = pstr + keylen + 1;

  jerry_string_to_char_buffer(jkey, (jerry_char_t*)key, keylen);
  pstr[keylen] = '\0';
  jerry_string_to_char_buffer(jval, (jerry_char_t*)val, vallen);
  pstr[keylen + vallen + 1] = '\0';

  int r = property_set(key, val);
  if (r == 0) {
    return jerry_create_boolean(true);
  } else {
    return JS_CREATE_ERROR(COMMON, "key is too long.");
  }
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "get", GetProperty);
  iotjs_jval_set_method(exports, "set", SetProperty);

#define IOTJS_SET_CONSTANT(jobj, name)                                    \
  do {                                                                    \
    jerry_value_t jkey = jerry_create_string((const jerry_char_t*)#name); \
    jerry_value_t jval = jerry_create_number(name);                       \
    jerry_set_property(jobj, jkey, jval);                                 \
    jerry_release_value(jkey);                                            \
    jerry_release_value(jval);                                            \
  } while (0)

  IOTJS_SET_CONSTANT(exports, PROP_VALUE_MAX);
#undef IOTJS_SET_CONSTANT
}

NODE_MODULE(volume, init)
