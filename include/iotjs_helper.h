#ifndef YODA_IOTJS_HELPER_H_
#define YODA_IOTJS_HELPER_H_

#include <iotjs_def.h>
#include <iotjs_binding.h>

#define IOTJS_SET_CONSTANT(jobj, name)                                    \
  do {                                                                    \
    jerry_value_t jkey = jerry_create_string((const jerry_char_t*)#name); \
    jerry_value_t jval = jerry_create_number(name);                       \
    jerry_set_property(jobj, jkey, jval);                                 \
    jerry_release_value(jkey);                                            \
    jerry_release_value(jval);                                            \
  } while (0)

#endif
