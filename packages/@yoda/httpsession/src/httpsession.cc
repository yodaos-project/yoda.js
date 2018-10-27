#include <HttpSession.h>
#include <mutex>
#include <list>
#include <common.h>
#include <node_api.h>
#include <uv.h>
#include <stdio.h>

using namespace std;

struct HttpSessionAsyncTask {
  napi_env env = nullptr;
  napi_ref callback = nullptr;
  int code = 0;
  string body;
  int error = 0;
  string errorMessage;
  map<string, string> headers;

  ~HttpSessionAsyncTask() {
    if (env && callback) {
      NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, callback));
    }
  }
};

static void ticketDeleter(HttpSession::Ticket* tic) {
  auto task = (HttpSessionAsyncTask*)tic->request.userdata;
  if (task) {
    delete task;
  }
}

static uv_async_t async;
static mutex taskMutex;
static list<HttpSessionAsyncTask*> tasks;

class NodeHttpSessionRequestListener
    : public HttpSessionRequestListenerInterface {
 public:
  virtual void onRequestFinished(HttpSession* session, HttpSession::Ticket* tic,
                                 HttpSession::Response* resp) {
    auto task = (HttpSessionAsyncTask*)tic->request.userdata;
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

    taskMutex.lock();
    tasks.push_back(task);
    taskMutex.unlock();
    uv_async_send(&async);
  }

  virtual void onRequestCanceled(HttpSession* session,
                                 HttpSession::Ticket* tic) {
    // do nothing
  }
};

static HttpSession* session = new HttpSession({ "", 60, true });
static NodeHttpSessionRequestListener listener;

static void handleFinishedTickets(uv_async_t* handle) {
  list<HttpSessionAsyncTask*> ts;
  taskMutex.lock();
  ts.swap(tasks);
  taskMutex.unlock();

  const int argc = 2;
  int code, error;
  string *body, *message;
  napi_env env;
  napi_async_context ctx;
  napi_handle_scope scope;
  napi_value cb, resName, recv, argv[argc], key, value, headersObj;

  for (auto it = ts.begin(); it != ts.end(); ++it) {
    env = (*it)->env;
    error = (*it)->error;
    message = &(*it)->errorMessage;
    code = (*it)->code;
    body = &(*it)->body;

    NAPI_CALL_RETURN_VOID(env, napi_open_handle_scope(env, &scope));
    NAPI_CALL_RETURN_VOID(env,
                          napi_get_reference_value(env, (*it)->callback, &cb));
    NAPI_CALL_RETURN_VOID(env,
                          napi_create_string_utf8(env, "httpsession",
                                                  NAPI_AUTO_LENGTH, &resName));
    NAPI_CALL_RETURN_VOID(env, napi_async_init(env, cb, resName, &ctx));
    NAPI_CALL_RETURN_VOID(env, napi_get_global(env, &recv));

    if (error) {
      NAPI_CALL_RETURN_VOID(env, napi_create_object(env, &argv[0]));

      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, "code",
                                                    NAPI_AUTO_LENGTH, &key));
      NAPI_CALL_RETURN_VOID(env, napi_create_int32(env, error, &value));
      NAPI_CALL_RETURN_VOID(env, napi_set_property(env, argv[0], key, value));

      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, "message",
                                                    NAPI_AUTO_LENGTH, &key));
      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, message->c_str(),
                                                    message->size(), &value));
      NAPI_CALL_RETURN_VOID(env, napi_set_property(env, argv[0], key, value));

      napi_get_undefined(env, &argv[1]);
    } else {
      napi_get_undefined(env, &argv[0]);

      NAPI_CALL_RETURN_VOID(env, napi_create_object(env, &argv[1]));

      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, "code",
                                                    NAPI_AUTO_LENGTH, &key));
      NAPI_CALL_RETURN_VOID(env, napi_create_int32(env, code, &value));
      NAPI_CALL_RETURN_VOID(env, napi_set_property(env, argv[1], key, value));

      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, "body",
                                                    NAPI_AUTO_LENGTH, &key));
      NAPI_CALL_RETURN_VOID(env, napi_create_string_utf8(env, body->c_str(),
                                                         body->size(), &value));
      NAPI_CALL_RETURN_VOID(env, napi_set_property(env, argv[1], key, value));

      NAPI_CALL_RETURN_VOID(env, napi_create_object(env, &headersObj));
      for (auto ite = (*it)->headers.begin(); ite != (*it)->headers.end();
           ++ite) {
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

      NAPI_CALL_RETURN_VOID(env,
                            napi_create_string_utf8(env, "headers",
                                                    NAPI_AUTO_LENGTH, &key));
      NAPI_CALL_RETURN_VOID(env,
                            napi_set_property(env, argv[1], key, headersObj));
    }

    NAPI_CALL_RETURN_VOID(env, napi_make_callback(env, ctx, recv, cb, argc,
                                                  argv, nullptr));
    NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, (*it)->callback));
    NAPI_CALL_RETURN_VOID(env, napi_async_destroy(env, ctx));
    NAPI_CALL_RETURN_VOID(env, napi_close_handle_scope(env, scope));

    (*it)->callback = nullptr;
  }
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

  return true;
}

static napi_value abort(napi_env env, napi_callback_info info) {
  uv_close((uv_handle_t*)&async, nullptr);
}

static napi_value request(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[argc];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr));
  if (argc != 3) {
    NAPI_CALL(env, napi_throw_error(env, nullptr, "Wrong arguments number"));
    return nullptr;
  }

  HttpSession::Request req;

  napi_valuetype type;
  napi_valuetype expects[] = { napi_string, napi_object, napi_function };
  napi_value value;
  napi_ref callback = nullptr;
  char* s;
  size_t len;
  for (int i = 0; i < 3; ++i) {
    value = argv[i];
    NAPI_CALL(env, napi_typeof(env, value, &type));

    if (type != expects[i]) {
      if (i == 0) {
        NAPI_CALL(env, napi_throw_error(env, nullptr, "Argument type error"));
      } else {
        continue;
      }
      return nullptr;
    }

    switch (i) {
      case 0:
        if (!NAPI_ASSIGN_STD_STRING(env, req.url, value)) {
          NAPI_CALL(env, napi_throw_error(env, nullptr, "Get URL failed"));
          return nullptr;
        }
        break;
      case 1:
        if (!buildRequest(req, env, value)) {
          NAPI_CALL(env,
                    napi_throw_error(env, nullptr, "Build request failed"));
          return nullptr;
        }
        break;
      case 2:
        NAPI_CALL(env, napi_create_reference(env, value, 1, &callback));
        break;
      default:
        break;
    }
  }

  if (callback) {
    auto task = new HttpSessionAsyncTask();
    task->callback = callback;
    task->env = env;
    req.userdata = task;
  }
  session->request(req, &listener, ticketDeleter);

  return nullptr;
}

static napi_value Init(napi_env env, napi_value exports) {
  uv_loop_s* loop;
  NAPI_CALL(env, napi_get_uv_event_loop(env, &loop));
  int ret = uv_async_init(loop, &async, handleFinishedTickets);

  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("abort", abort),
    DECLARE_NAPI_PROPERTY("request", request),
  };
  size_t property_count = sizeof(desc) / sizeof(*desc);
  NAPI_CALL(env, napi_define_properties(env, exports, property_count, desc));

  return exports;
}

NAPI_MODULE(httpsession, Init)
