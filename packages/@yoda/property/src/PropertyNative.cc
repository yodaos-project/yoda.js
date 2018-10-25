#include <node_api.h>
#include <stdio.h>
#include <common.h>
#include <string.h>
#include <cutils/properties.h>

static napi_value GetProperty(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  size_t keylen;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_string_utf8(env, argv[0], NULL, 0, &keylen);
  char key[keylen + 1];
  size_t res;
  napi_status status =
      napi_get_value_string_utf8(env, argv[0], key, keylen + 1, &res);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "key must be a string");
    return NULL;
  }
  key[keylen] = '\0';
  char val[PROP_VALUE_MAX];
  property_get(key, val, "");
  napi_create_string_utf8(env, val, strlen(val), &returnVal);
  return returnVal;
}
static napi_value SetProperty(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  size_t keylen;
  size_t vallen;
  size_t keyRes;
  size_t valRes;
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_string_utf8(env, argv[0], NULL, 0, &keylen);
  char str[keylen + 1];
  napi_status status =
      napi_get_value_string_utf8(env, argv[0], str, keylen + 1, &keyRes);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "key must be a string");
    return NULL;
  }
  napi_get_value_string_utf8(env, argv[1], NULL, 0, &vallen);
  char strl[vallen + 1];
  status = napi_get_value_string_utf8(env, argv[1], strl, vallen + 1, &valRes);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "key must be a string");
    return NULL;
  }
  if (valRes > PROP_VALUE_MAX)
    valRes = PROP_VALUE_MAX;
  int r = property_set(str, strl);
  if (r == 0) {
    napi_get_boolean(env, true, &returnVal);
    return returnVal;
  } else {
    napi_throw_error(env, NULL, "key is too long");
    return NULL;
  }
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("get", GetProperty),
    DECLARE_NAPI_PROPERTY("set", SetProperty),
  };
  napi_define_properties(env, exports, sizeof(desc) / sizeof(*desc), desc);
  NAPI_SET_CONSTANT(exports, PROP_VALUE_MAX);
  return exports;
}

NAPI_MODULE(property, Init)
