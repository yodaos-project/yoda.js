#pragma once

#include <map>
#include <list>
#include <mutex>
#include <condition_variable>
#include "napi.h"
#include "flora-agent.h"
#include "uv.h"

typedef std::map<std::string, Napi::FunctionReference> SubscriptionMap;

class MsgCallbackInfo {
 public:
  explicit MsgCallbackInfo(Napi::Env e)
      : msgtype(FLORA_MSGTYPE_INSTANT), env(e) {
  }

  std::string msgName;
  std::shared_ptr<Caps> msg;
  uint32_t msgtype;
  Napi::Env env;
  std::shared_ptr<flora::Reply> reply;
};

class RespCallbackInfo {
 public:
  std::shared_ptr<Napi::FunctionReference> cbr;
  int32_t rescode;
  flora::Response response;
};

class HackedNativeCaps {
 public:
  std::shared_ptr<Caps> caps;
};

#define NATIVE_STATUS_CONFIGURED 0x1
#define NATIVE_STATUS_STARTED 0x2
#define ASYNC_HANDLE_COUNT 2

class ClientNative {
 public:
  void handleMsgCallbacks();

  void handleRespCallbacks();

  Napi::Value start(const Napi::CallbackInfo& info);

  Napi::Value subscribe(const Napi::CallbackInfo& info);

  Napi::Value unsubscribe(const Napi::CallbackInfo& info);

  Napi::Value declareMethod(const Napi::CallbackInfo& info);

  Napi::Value removeMethod(const Napi::CallbackInfo& info);

  Napi::Value post(const Napi::CallbackInfo& info);

  Napi::Value call(const Napi::CallbackInfo& info);

  Napi::Value genArray(const Napi::CallbackInfo& info);

  void initialize(const Napi::CallbackInfo& info);

  void close();

  void refDown();

 private:
  void msgCallback(const char* name, Napi::Env env, std::shared_ptr<Caps>& msg,
                   uint32_t type, std::shared_ptr<flora::Reply> reply);

  void respCallback(std::shared_ptr<Napi::FunctionReference> cbr,
                    int32_t rescode, flora::Response& response);

 private:
  flora::Agent floraAgent;
  SubscriptionMap subscriptions;
  SubscriptionMap remoteMethods;
  uv_async_t msgAsync;
  uv_async_t respAsync;
  std::list<MsgCallbackInfo> pendingMsgs;
  std::list<RespCallbackInfo> pendingResponses;
  std::mutex cb_mutex;
  std::condition_variable cb_cond;
  Napi::Reference<Napi::Value> thisRef;
  napi_async_context asyncContext = nullptr;
  napi_env thisEnv = 0;
  // CONFIGURED
  // STARTED
  uint32_t status = 0;
  uint32_t asyncHandleCount = ASYNC_HANDLE_COUNT;
};

class NativeObjectWrap : public Napi::ObjectWrap<NativeObjectWrap> {
 public:
  explicit NativeObjectWrap(const Napi::CallbackInfo& info);

  ~NativeObjectWrap();

  static Napi::Object Init(Napi::Env env, Napi::Object exports);

 private:
  Napi::Value start(const Napi::CallbackInfo& info);

  Napi::Value subscribe(const Napi::CallbackInfo& info);

  Napi::Value unsubscribe(const Napi::CallbackInfo& info);

  Napi::Value declareMethod(const Napi::CallbackInfo& info);

  Napi::Value removeMethod(const Napi::CallbackInfo& info);

  Napi::Value close(const Napi::CallbackInfo& info);

  Napi::Value post(const Napi::CallbackInfo& info);

  Napi::Value call(const Napi::CallbackInfo& info);

  Napi::Value genArray(const Napi::CallbackInfo& info);

 private:
  ClientNative* thisClient = nullptr;
};

class NativeReply {
 public:
  static void init(napi_env env);

  static napi_value newInstance(napi_env env, napi_callback_info cbinfo);

  static napi_value createObject(napi_env env,
                                 std::shared_ptr<flora::Reply>& reply);

  static void objectFinalize(napi_env env, void* data, void* hint);

  explicit NativeReply(std::shared_ptr<flora::Reply>& r) : reply(r) {
  }

 public:
  napi_value writeCode(napi_env env, napi_value thisObj, size_t argc,
                       napi_value* argv);

  napi_value writeData(napi_env env, napi_value thisObj, size_t argc,
                       napi_value* argv);

  napi_value end(napi_env env, napi_value thisObj, size_t argc,
                 napi_value* argv);

 private:
  static napi_value writeCodeStatic(napi_env env, napi_callback_info cbinfo);

  static napi_value writeDataStatic(napi_env env, napi_callback_info cbinfo);

  static napi_value endStatic(napi_env env, napi_callback_info cbinfo);

  typedef napi_value (NativeReply::*NapiCallbackFunc)(napi_env env,
                                                      napi_value thisObj,
                                                      size_t argc,
                                                      napi_value* argv);

  static napi_value callNativeMethod(napi_env env, napi_callback_info cbinfo,
                                     NapiCallbackFunc cb);

 private:
  static napi_ref replyConstructor;

  std::shared_ptr<flora::Reply> reply;
};
