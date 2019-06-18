#include <HttpSession.h>
#include <mutex>
#include <list>
#include <common.h>
#include <node_api.h>
#include <uv.h>
#include <stdio.h>

using namespace std;

struct HttpSessionAsyncTask {
  /** initialization fields */
  napi_env env = nullptr;
  napi_ref callback = nullptr;
  uv_async_t async;

  /** result fields */
  int code = 0;
  string body;
  int error = 0;
  string errorMessage;
  map<string, string> headers;

  static void OnDrop(uv_handle_t* handle) {
    auto task = reinterpret_cast<HttpSessionAsyncTask*>(handle->data);
    delete task;
  }

  void drop() {
    auto handle = reinterpret_cast<uv_handle_t*>(&async);
    uv_close(handle, HttpSessionAsyncTask::OnDrop);
  }

  ~HttpSessionAsyncTask() {
    if (env && callback) {
      NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, callback));
    }
  }
};

class NodeHttpSessionRequestListener
    : public HttpSessionRequestListenerInterface {
 public:
  // cppcheck-suppress unusedFunction
  virtual void onRequestFinished(HttpSession* session, HttpSession::Ticket* tic,
                                 HttpSession::Response* resp) {
    auto task = static_cast<HttpSessionAsyncTask*>(tic->request.userdata);
    if (!task) {
      return;
    }

    if (tic->errorCode()) {
      task->error = tic->errorCode();
      if (tic->errorMessage()) {
        task->errorMessage.assign(tic->errorMessage());
      }
    } else {
      task->code = resp->code;
      if (resp->body) {
        task->body.assign(resp->body, resp->contentLength);
      }
      task->headers = resp->headers;
    }

    uv_async_send(&task->async);
  }

  // cppcheck-suppress unusedFunction
  virtual void onRequestCanceled(HttpSession* session,
                                 HttpSession::Ticket* tic) {
    auto task = static_cast<HttpSessionAsyncTask*>(tic->request.userdata);
    if (!task) {
      return;
    }
    task->error = -1;
    char errMsg[] = "Request has been canceled.";
    task->errorMessage.assign(errMsg, sizeof(errMsg) / sizeof(char));
    uv_async_send(&task->async);
  }
};

static HttpSession* session = new HttpSession({ "", 60, true });
static NodeHttpSessionRequestListener listener;

static void handleFinishedTickets(uv_async_t* handle) {
  auto task = static_cast<HttpSessionAsyncTask*>(handle->data);
  if (!task) {
    return;
  }

  const int argc = 2;
  napi_env env;
  napi_async_context ctx;
  napi_handle_scope scope;
  napi_value cb, resName, recv, argv[argc];

  env = task->env;

  int error = task->error;
  int code = task->code;
  string* message = &task->errorMessage;
  string* body = &task->body;

  NAPI_CALL_RETURN_VOID(env, napi_open_handle_scope(env, &scope));
  NAPI_CALL_RETURN_VOID(env,
                        napi_get_reference_value(env, task->callback, &cb));
  NAPI_CALL_RETURN_VOID(env,
                        napi_create_string_utf8(env, "httpsession",
                                                NAPI_AUTO_LENGTH, &resName));
  NAPI_CALL_RETURN_VOID(env, napi_async_init(env, cb, resName, &ctx));
  NAPI_CALL_RETURN_VOID(env, napi_get_global(env, &recv));

  if (error) {
    char buffer[256];
    napi_value nval_code, nval_msg;

    sprintf(buffer, "%d", error);
    NAPI_CALL_RETURN_VOID(env,
                          napi_create_string_utf8(env, buffer, NAPI_AUTO_LENGTH,
                                                  &nval_code));
    NAPI_CALL_RETURN_VOID(env,
                          napi_create_string_utf8(env, message->c_str(),
                                                  message->size(), &nval_msg));

    NAPI_CALL_RETURN_VOID(env, napi_create_error(env, nval_code, nval_msg,
                                                 &argv[0]));

    napi_get_undefined(env, &argv[1]);
  } else {
    napi_value key, value, headersObj;
    napi_get_undefined(env, &argv[0]);

    NAPI_CALL_RETURN_VOID(env, napi_create_object(env, &argv[1]));

    NAPI_CALL_RETURN_VOID(env, napi_create_string_utf8(env, "code",
                                                       NAPI_AUTO_LENGTH, &key));
    NAPI_CALL_RETURN_VOID(env, napi_create_int32(env, code, &value));
    NAPI_CALL_RETURN_VOID(env, napi_set_property(env, argv[1], key, value));

    NAPI_CALL_RETURN_VOID(env, napi_create_string_utf8(env, "body",
                                                       NAPI_AUTO_LENGTH, &key));
    NAPI_CALL_RETURN_VOID(env, napi_create_string_utf8(env, body->c_str(),
                                                       body->size(), &value));
    NAPI_CALL_RETURN_VOID(env, napi_set_property(env, argv[1], key, value));

    NAPI_CALL_RETURN_VOID(env, napi_create_object(env, &headersObj));
    for (auto ite = task->headers.begin(); ite != task->headers.end(); ++ite) {
      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, ite->first.c_str(),
                                                    ite->first.size(), &key));
      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, ite->second.c_str(),
                                                    ite->second.size(),
                                                    &value));
      NAPI_CALL_RETURN_VOID(env,
                            napi_set_property(env, headersObj, key, value));
    }

    NAPI_CALL_RETURN_VOID(env, napi_create_string_utf8(env, "headers",
                                                       NAPI_AUTO_LENGTH, &key));
    NAPI_CALL_RETURN_VOID(env,
                          napi_set_property(env, argv[1], key, headersObj));
  }

  NAPI_CALL_RETURN_VOID(env, napi_make_callback(env, ctx, recv, cb, argc, argv,
                                                nullptr));
  NAPI_CALL_RETURN_VOID(env, napi_async_destroy(env, ctx));
  NAPI_CALL_RETURN_VOID(env, napi_close_handle_scope(env, scope));

  task->drop();
}

static int appendHeaders(map<string, string>& target, napi_env env,
                         napi_value source) {
  uint32_t count = 0, appended = 0;
  napi_value keys = nullptr, skey = nullptr, svalue = nullptr;
  NAPI_CALL_BASE(env, napi_get_property_names(env, source, &keys), -1);
  NAPI_CALL_BASE(env, napi_get_array_length(env, keys, &count), -1);
  if (count == 0) {
    return 0;
  }

  string tkey, tvalue;
  for (uint32_t i = 0; i < count; ++i) {
    NAPI_CALL_BASE(env, napi_get_element(env, keys, i, &skey), -1);
    if ((svalue = NAPI_GET_PROPERTY(env, source, nullptr, skey, napi_string)) !=
            nullptr &&
        NAPI_ASSIGN_STD_STRING(env, tkey, skey) &&
        NAPI_ASSIGN_STD_STRING(env, tvalue, svalue)) {
      target[tkey] = tvalue;
      appended++;
    }
  }
  return appended;
}

static bool buildRequest(HttpSession::Request& req, napi_env env,
                         napi_value options) {
  napi_value value;

  value = NAPI_GET_PROPERTY(env, options, "body", nullptr, napi_string);
  if (value && !(req.body = NAPI_COPY_STRING(env, value, req.length))) {
    return false;
  }

  req.releaseBody = true;

  value = NAPI_GET_PROPERTY(env, options, "method", nullptr, napi_string);
  if (value && !NAPI_ASSIGN_STD_STRING(env, req.method, value)) {
    return false;
  }

  value = NAPI_GET_PROPERTY(env, options, "timeout", nullptr, napi_number);
  if (value) {
    int32_t timeout = 0;
    NAPI_CALL_BASE(env, napi_get_value_int32(env, value, &timeout), false);
    if (timeout > 0) {
      req.timeout = timeout;
    }
  }

  value = NAPI_GET_PROPERTY(env, options, "headers", nullptr, napi_object);
  if (value && appendHeaders(req.headers, env, value) < 0) {
    return false;
  }

  value = NAPI_GET_PROPERTY(env, options, "trust_all", nullptr, napi_boolean);
  if (value) {
    bool trust = false;
    NAPI_CALL_BASE(env, napi_get_value_bool(env, value, &trust), false);
    if (trust) {
      req.verifyPolicy = HttpSession::SSLVerifyPolicy::VERIFY_NONE;
    }
  }

  return true;
}

static void finalizeRequestTicket(napi_env env, void* finalize_data,
                                  void* finalize_hint) {
  auto acq_ticket =
      static_cast<shared_ptr<HttpSession::Ticket>*>(finalize_data);
  delete acq_ticket;
}

static napi_value abort(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[argc];

  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr));
  if (argc != 1) {
    NAPI_CALL(env, napi_throw_error(env, nullptr, "Wrong arguments number"));
    return nullptr;
  }

  void* wrapped;
  NAPI_CALL(env, napi_unwrap(env, argv[0], &wrapped));
  if (wrapped == nullptr) {
    return nullptr;
  }
  auto acq_ticket = static_cast<shared_ptr<HttpSession::Ticket>*>(wrapped);
  session->cancel(*acq_ticket);

  return nullptr;
}

static napi_value request(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[argc];

  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr));
  if (argc < 1) {
    NAPI_CALL(env, napi_throw_error(env, nullptr, "Wrong arguments number"));
    return nullptr;
  }

  HttpSession::Request req;

  napi_valuetype type;
  napi_value value;
  napi_ref callback = nullptr;
  for (int i = 0; i < 3; ++i) {
    value = argv[i];
    NAPI_CALL(env, napi_typeof(env, value, &type));

    switch (i) {
      case 0:
        if (type != napi_string) {
          NAPI_CALL(env,
                    napi_throw_error(env, nullptr,
                                     "Argument type error, expect a string."));
          return nullptr;
        }
        if (!NAPI_ASSIGN_STD_STRING(env, req.url, value)) {
          NAPI_CALL(env, napi_throw_error(env, nullptr, "Get URL failed"));
          return nullptr;
        }
        break;
      case 1:
        if (type == napi_function) {
          argv[2] = argv[1];
          break;
        }
        if (type != napi_object) {
          NAPI_CALL(env,
                    napi_throw_error(env, nullptr,
                                     "Argument type error, expect an object."));
          return nullptr;
        }
        if (!buildRequest(req, env, value)) {
          NAPI_CALL(env,
                    napi_throw_error(env, nullptr, "Build request failed"));
          return nullptr;
        }
        break;
      case 2:
        if (type != napi_function) {
          NAPI_CALL(
              env, napi_throw_error(env, nullptr,
                                    "Argument type error, expect a function."));
          return nullptr;
        }
        NAPI_CALL(env, napi_create_reference(env, value, 1, &callback));
        break;
      default:
        break;
    }
  }

  if (callback) {
    uv_loop_t* loop;
    NAPI_CALL(env, napi_get_uv_event_loop(env, &loop));

    auto task = new HttpSessionAsyncTask();
    task->env = env;
    task->callback = callback;
    task->async.data = task;
    req.userdata = task;
    uv_async_init(loop, &task->async, handleFinishedTickets);
  }
  auto ticket = session->request(req, &listener);
  shared_ptr<HttpSession::Ticket>* acq_ticket =
      new shared_ptr<HttpSession::Ticket>(ticket);

  napi_value nval_ret;
  napi_ref weak_ref;
  NAPI_CALL(env, napi_create_object(env, &nval_ret));
  NAPI_CALL(env, napi_wrap(env, nval_ret, static_cast<void*>(acq_ticket),
                           finalizeRequestTicket, nullptr, &weak_ref));

  return nval_ret;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("abort", abort),
    DECLARE_NAPI_PROPERTY("request", request),
  };
  size_t property_count = sizeof(desc) / sizeof(*desc);
  NAPI_CALL(env, napi_define_properties(env, exports, property_count, desc));

  return exports;
}

NAPI_MODULE(httpsession, Init)
