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

struct PropertyListInfo {
  napi_env env;
  napi_value fn;
};

void ListPropertyIterator(const char* key, const char* value, void* cookie) {
  auto info = static_cast<struct PropertyListInfo*>(cookie);
  napi_env env = info->env;
  napi_value fn = info->fn;
  napi_value global;
  napi_value nval[2];

  auto status = napi_create_string_utf8(env, key, NAPI_AUTO_LENGTH, nval);
  if (status != napi_ok) {
    napi_throw_error(env, "unknown",
                     "Unexpected error on creating JavaScript string");
    return;
  }
  status = napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, nval + 1);
  if (status != napi_ok) {
    napi_throw_error(env, "unknown",
                     "Unexpected error on creating JavaScript string");
    return;
  }

  napi_get_global(env, &global);
  napi_call_function(env, global, fn, 2, nval, NULL);
}

static napi_value ListProperty(napi_env env, napi_callback_info info) {
  napi_value fn;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_valuetype valtype;
  napi_typeof(env, argv[0], &valtype);
  if (valtype != napi_function) {
    napi_throw_type_error(
        env, "function_expected",
        "Expect a function on first argument of ListProperty.");
    return nullptr;
  }

  struct PropertyListInfo native_info = { env, argv[0] };
  auto code = property_list(ListPropertyIterator, &native_info);

  napi_value nval_code;
  napi_create_int32(env, code, &nval_code);
  return nval_code;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("get", GetProperty),
    DECLARE_NAPI_PROPERTY("set", SetProperty),
    DECLARE_NAPI_PROPERTY("list", ListProperty),
  };
  napi_define_properties(env, exports, sizeof(desc) / sizeof(*desc), desc);
  NAPI_SET_CONSTANT(exports, PROP_VALUE_MAX);
  return exports;
}

NAPI_MODULE(property, Init)
