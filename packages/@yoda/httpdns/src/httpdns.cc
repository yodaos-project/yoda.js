#include "httpdns.h"
#include <node_api.h>
#include <uv.h>
#include <stdio.h>
#include <common.h>
#include <string.h>
#include <mutex>
#include <list>

using namespace std;
static bool g_httpdns_initd = false;
static uv_async_t async;

class HttpdnsAsyncTask {
 public:
  napi_env env;
  napi_ref callback;
  uv_async_t async_handle;
  int status;

 public:
  ~HttpdnsAsyncTask() {
    if (env && callback) {
      NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, callback));
    }
  }
};

static int notifyFinishedNotify(int status, void* userdata) {
  HttpdnsAsyncTask* task = reinterpret_cast<HttpdnsAsyncTask*>(userdata);
  task->status = status;
  uv_async_send(&task->async_handle);
}

static void onHandleFinishedServiceClose(uv_handle_t* handle) {
  HttpdnsAsyncTask* task = reinterpret_cast<HttpdnsAsyncTask*>(handle->data);
  delete task;
}

static void handleFinishedService(uv_async_t* handle) {
  HttpdnsAsyncTask* task = reinterpret_cast<HttpdnsAsyncTask*>(handle->data);
  if (nullptr == task) {
    return;
  }

  napi_env env = task->env;
  napi_ref reference = task->callback;
  napi_value fun;
  napi_handle_scope scope;
  napi_value global;
  napi_value argv[1];

  napi_open_handle_scope(env, &scope);
  napi_get_reference_value(env, reference, &fun);
  napi_get_global(env, &global);

  if (0 != task->status) {
    napi_value errorMsg;
    napi_create_string_utf8(env, "sync httpdns service failed",
                            NAPI_AUTO_LENGTH, &errorMsg);
    napi_create_error(env, nullptr, errorMsg, &argv[0]);
  } else {
    napi_get_undefined(env, &argv[0]);
  }

  napi_make_callback(env, nullptr, global, fun, 1, argv, nullptr);
  napi_close_handle_scope(env, scope);
  uv_close((uv_handle_t*)handle, onHandleFinishedServiceClose);
}

static napi_value syncService(napi_env env, napi_callback_info info) {
  int ret;
  int timeout;
  size_t key;
  size_t snLen;
  size_t typeLen;
  napi_status status;
  size_t argc = 4;
  napi_value argv[4];
  napi_value returnVal;
  napi_ref callback = nullptr;
  uv_loop_t* loop;

  if (false == g_httpdns_initd) {
    g_httpdns_initd = true;
    httpdns_service_init();
  }

  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_string_utf8(env, argv[0], nullptr, 0, &snLen);
  if (snLen == 0) {
    napi_throw_error(env, nullptr, "sn must be a string");
    return nullptr;
  }

  char sn[snLen + 1] = { 0 };
  status = napi_get_value_string_utf8(env, argv[0], sn, snLen + 1, &key);
  if (status != napi_ok) {
    env, napi_throw_error(env, nullptr, "sn must be a string");
    return nullptr;
  }
  sn[snLen] = '\0';

  napi_get_value_string_utf8(env, argv[1], nullptr, 0, &typeLen);
  char devType[typeLen + 1] = { 0 };

  if (0 != typeLen) {
    status =
        napi_get_value_string_utf8(env, argv[1], devType, typeLen + 1, &key);
    if (status != napi_ok) {
      napi_throw_error(env, nullptr, "devType must be a string");
      return nullptr;
    }
  }
  devType[typeLen] = '\0';

  napi_get_value_int32(env, argv[2], &timeout);
  napi_create_reference(env, argv[3], 1, &callback);
  auto task = new HttpdnsAsyncTask();
  if (callback) {
    task->callback = callback;
    napi_get_uv_event_loop(env, &loop);
    uv_async_init(loop, &task->async_handle, handleFinishedService);
    task->env = env;
    task->async_handle.data = task;
  }

  ret = httpdns_resolve_gslb(sn, devType, timeout, notifyFinishedNotify,
                             (void*)task);
  if (ret == 0) {
    napi_get_boolean(env, true, &returnVal);
    return returnVal;
  } else {
    napi_throw_error(env, nullptr, "execte httpdns resolve failure");
    return nullptr;
  }
}

static napi_value resolve(napi_env env, napi_callback_info info) {
  int ret;
  size_t key;
  size_t hostLen;
  char ip[32] = { 0 };
  size_t argc = 1;
  napi_value argv[1];
  napi_value returnVal;
  napi_status status;

  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_string_utf8(env, argv[0], nullptr, 0, &hostLen);
  char host[hostLen + 1] = { 0 };
  status = napi_get_value_string_utf8(env, argv[0], host, hostLen + 1, &key);
  if (status != napi_ok) {
    napi_throw_error(env, nullptr, "sn must be a string");
    return nullptr;
  }
  host[hostLen] = '\0';

  ret = httpdns_getips_by_host(host, ip);
  if (ret == 0) {
    napi_create_string_utf8(env, ip, strlen(ip), &returnVal);
    return returnVal;
  } else {
    napi_get_boolean(env, false, &returnVal);
    return returnVal;
  }
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("syncService", syncService),
    DECLARE_NAPI_PROPERTY("resolve", resolve),
  };
  napi_define_properties(env, exports, sizeof(desc) / sizeof(*desc), desc);
  return exports;
}

NAPI_MODULE(httpdns, Init)
