#ifndef YODA_COMMON_H_
#define YODA_COMMON_H_

#include <node_api.h>

// Empty value so that macros here are able to return NULL or void
#define NAPI_RETVAL_NOTHING // Intentionally blank #define

#define GET_AND_THROW_LAST_ERROR(env)                               \
  do {                                                              \
    const napi_extended_error_info* error_info;                     \
    napi_get_last_error_info((env), &error_info);                   \
    bool is_pending;                                                \
    napi_is_exception_pending((env), &is_pending);                  \
    /* If an exception is already pending, don't rethrow it */      \
    if (!is_pending) {                                              \
      const char* error_message = error_info->error_message != NULL \
                                      ? error_info->error_message   \
                                      : "empty error message";      \
      napi_throw_error((env), NULL, error_message);                 \
    }                                                               \
  } while (0)

#define NAPI_ASSERT_BASE(env, assertion, message, ret_val)             \
  do {                                                                 \
    if (!(assertion)) {                                                \
      napi_throw_error((env), NULL,                                    \
                       "assertion (" #assertion ") failed: " message); \
      return ret_val;                                                  \
    }                                                                  \
  } while (0)

// Returns NULL on failed assertion.
// This is meant to be used inside napi_callback methods.
#define NAPI_ASSERT(env, assertion, message) \
  NAPI_ASSERT_BASE(env, assertion, message, NULL)

// Returns empty on failed assertion.
// This is meant to be used inside functions with void return type.
#define NAPI_ASSERT_RETURN_VOID(env, assertion, message) \
  NAPI_ASSERT_BASE(env, assertion, message, NAPI_RETVAL_NOTHING)

#define NAPI_CALL_BASE(env, the_call, ret_val) \
  do {                                         \
    if ((the_call) != napi_ok) {               \
      GET_AND_THROW_LAST_ERROR((env));         \
      return ret_val;                          \
    }                                          \
  } while (0)

// Returns NULL if the_call doesn't return napi_ok.
#define NAPI_CALL(env, the_call) NAPI_CALL_BASE(env, the_call, NULL)

// Returns empty if the_call doesn't return napi_ok.
#define NAPI_CALL_RETURN_VOID(env, the_call) \
  NAPI_CALL_BASE(env, the_call, NAPI_RETVAL_NOTHING)

#define DECLARE_NAPI_PROPERTY(name, func) \
  { (name), 0, (func), 0, 0, 0, napi_default, 0 }

#define DECLARE_NAPI_GETTER(name, func) \
  { (name), 0, 0, (func), 0, 0, napi_default, 0 }

#define SET_NAMED_METHOD(env, target, prop_name, handler)            \
  do {                                                               \
    napi_status status;                                              \
    napi_value fn;                                                   \
    status = napi_create_function(env, NULL, 0, handler, NULL, &fn); \
    if (status != napi_ok)                                           \
      return NULL;                                                   \
                                                                     \
    status = napi_set_named_property(env, target, prop_name, fn);    \
    if (status != napi_ok)                                           \
      return NULL;                                                   \
  } while (0);

#define GET_NAMED_STRING_PROPERTY(env, target, key, buf, len, res)        \
  do {                                                                    \
    napi_value nval;                                                      \
    NAPI_CALL(env, napi_get_named_property(env, target, key, &nval));     \
    NAPI_CALL(env, napi_get_value_string_utf8(env, nval, buf, len, res)); \
  } while (0);

#define GET_NAMED_INT_PROPERTY(env, target, key, res)                 \
  do {                                                                \
    napi_value nval;                                                  \
    NAPI_CALL(env, napi_get_named_property(env, target, key, &nval)); \
    NAPI_CALL(env, napi_get_value_int32(env, nval, res));             \
  } while (0);

#define NAPI_SET_CONSTANT(target, name)                       \
  do {                                                        \
    napi_value key;                                           \
    napi_value value;                                         \
    napi_create_string_utf8(env, #name, strlen(#name), &key); \
    napi_create_int32(env, name, &value);                     \
    napi_set_property(env, target, key, value);               \
  } while (0);

#define NAPI_GET_LAST_ERROR_MSG(env)                        \
  ({                                                        \
    const char* msg = nullptr;                              \
    const napi_extended_error_info* error;                  \
    if (napi_get_last_error_info(env, &error) == napi_ok) { \
      msg = error->error_message;                           \
    }                                                       \
    msg;                                                    \
  })

#define NAPI_COPY_STRING(env, value, size)                                   \
  ({                                                                         \
    char* str = nullptr;                                                     \
    if ((napi_get_value_string_utf8(env, (value), NULL, 0, &(size)) ==       \
         napi_ok) &&                                                         \
        ((str = (char*)malloc(size + 1)) != nullptr)) {                      \
      if (napi_get_value_string_utf8(env, (value), str, (size) + 1, NULL) != \
          napi_ok) {                                                         \
        free(str);                                                           \
        str = nullptr;                                                       \
      } else {                                                               \
        str[size] = '\0';                                                    \
      }                                                                      \
    }                                                                        \
    str;                                                                     \
  })

#define NAPI_ASSIGN_STD_STRING(env, stdstr, value) \
  ({                                               \
    size_t len = 0;                                \
    char* s = NAPI_COPY_STRING(env, value, len);   \
    if (s) {                                       \
      (stdstr).assign(s, len);                     \
      free(s);                                     \
    }                                              \
    len;                                           \
  })

#define NAPI_GET_PROPERTY(env, obj, ckey, nkey, type)                      \
  ({                                                                       \
    napi_value key = (nkey), value = nullptr;                              \
    bool has = false;                                                      \
    napi_valuetype type;                                                   \
    if (((key ||                                                           \
          napi_create_string_utf8(env, (ckey), NAPI_AUTO_LENGTH, &key) ==  \
              napi_ok)) &&                                                 \
        (napi_has_property(env, (obj), key, &has) == napi_ok) && has &&    \
        (napi_get_property(env, (obj), key, &value) == napi_ok)) {         \
      if ((napi_typeof(env, value, &type) != napi_ok) || type != (type)) { \
        value = nullptr;                                                   \
      }                                                                    \
    }                                                                      \
    value;                                                                 \
  })

#endif
