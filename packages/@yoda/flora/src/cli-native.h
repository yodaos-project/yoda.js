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
  MsgCallbackInfo(Napi::Env e) : env(e) {}

  MsgCallbackInfo(const MsgCallbackInfo& o) : msgName(o.msgName),
      msg(o.msg), msgtype(o.msgtype), env(o.env), reply(o.reply) {
  }

  std::string msgName;
  std::shared_ptr<Caps> msg;
  uint32_t msgtype;
  Napi::Env env;
  flora::Reply* reply = nullptr;
  bool handled = false;
};

class RespCallbackInfo {
public:
  std::shared_ptr<Napi::FunctionReference> cbr;
  flora::ResponseArray responses;
};

class ClientNative : public Napi::ObjectWrap<ClientNative> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  ClientNative(const Napi::CallbackInfo& info);

  void handleMsgCallbacks();

  void handleRespCallbacks();

private:
  Napi::Value start(const Napi::CallbackInfo& info);

  Napi::Value subscribe(const Napi::CallbackInfo& info);

  Napi::Value unsubscribe(const Napi::CallbackInfo& info);

  Napi::Value close(const Napi::CallbackInfo& info);

  Napi::Value post(const Napi::CallbackInfo& info);

  Napi::Value get(const Napi::CallbackInfo& info);

  void msgCallback(const std::string& name, Napi::Env env,
      std::shared_ptr<Caps>& msg, uint32_t type, flora::Reply* reply);

  void respCallback(std::shared_ptr<Napi::FunctionReference> cbr,
      flora::ResponseArray& responses);

private:
  flora::Agent floraAgent;
  SubscriptionMap subscriptions;
  uv_async_t msgAsync;
  uv_async_t respAsync;
  std::list<MsgCallbackInfo> pendingMsgs;
  std::list<RespCallbackInfo> pendingResponses;
  std::mutex cb_mutex;
  std::condition_variable cb_cond;
  Napi::Reference<Napi::Value> thisRef;
  napi_async_context asyncContext = nullptr;
  bool ready = false;
};
