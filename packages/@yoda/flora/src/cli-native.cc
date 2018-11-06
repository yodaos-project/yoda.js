#include <utility>
#include <chrono>
#include "cli-native.h"

#define ERROR_INVALID_URI -1
#define ERROR_INVALID_PARAM -2
#define ERROR_NOT_CONNECTED -3

using namespace std;
using namespace Napi;
using namespace flora;

static bool genCapsByJSMsg(Array&& jsmsg, shared_ptr<Caps>& caps);

static void msg_async_cb(uv_async_t* handle) {
  ClientNative* _this = (ClientNative*)handle->data;
  _this->handleMsgCallbacks();
}

static void resp_async_cb(uv_async_t* handle) {
  ClientNative* _this = (ClientNative*)handle->data;
  _this->handleRespCallbacks();
}

Object ClientNative::Init(Napi::Env env, Object exports) {
  HandleScope scope(env);

  Function ctor = DefineClass(env, "ClientNative", {
      InstanceMethod("start", &ClientNative::start),
      InstanceMethod("nativeSubscribe", &ClientNative::subscribe),
      InstanceMethod("unsubscribe", &ClientNative::unsubscribe),
      InstanceMethod("close", &ClientNative::close),
      InstanceMethod("post", &ClientNative::post),
      InstanceMethod("nativeGet", &ClientNative::get)
  });
  exports.Set("Agent", ctor);
  return exports;
}

ClientNative::ClientNative(const CallbackInfo& info)
    : ObjectWrap<ClientNative>(info) {
  Napi::Env env = info.Env();
  HandleScope scope(env);
  size_t len = info.Length();
  if (len < 1 || !info[0].IsString()) {
    TypeError::New(env, "String excepted").ThrowAsJavaScriptException();
    return;
  }
  std::string uri = std::string(info[0].As<String>());
  floraAgent.config(FLORA_AGENT_CONFIG_URI, uri.c_str());
  uint32_t n = 10000;
  if (len > 1 && info[1].IsNumber()) {
    n = info[1].As<Number>().DoubleValue();
  }
  floraAgent.config(FLORA_AGENT_CONFIG_RECONN_INTERVAL, n);
  n = 0;
  if (len > 2 && info[2].IsNumber()) {
    n = info[2].As<Number>().DoubleValue();
  }
  floraAgent.config(FLORA_AGENT_CONFIG_BUFSIZE, n);
  ready = true;
}

Value ClientNative::start(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (ready) {
    msgAsync.data = this;
    uv_async_init(uv_default_loop(), &msgAsync, msg_async_cb);
    respAsync.data = this;
    uv_async_init(uv_default_loop(), &respAsync, resp_async_cb);
    napi_async_init(env, info.This(), String::New(env, "flora-agent"),
        &asyncContext);
    floraAgent.start();
    thisRef = Napi::Persistent(info.This());
  }
  return env.Undefined();
}

Value ClientNative::subscribe(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!ready)
    return env.Undefined();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsFunction()) {
    TypeError::New(env, "String, Function excepted").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  std::string name = std::string(info[0].As<String>());
  if (subscriptions.find(name) != subscriptions.end())
    return env.Undefined();
  Function cb = info[1].As<Function>();
  auto r = subscriptions.insert(std::make_pair(name, Napi::Persistent(cb)));
  if (!r.second) {
    return env.Undefined();
  }
  floraAgent.subscribe(name.c_str(), [this, name, env](
        std::shared_ptr<Caps>& msg, uint32_t type, Reply* reply) {
      this->msgCallback(name, env, msg, type, reply);
  });
  return env.Undefined();
}

Value ClientNative::unsubscribe(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!ready)
    return env.Undefined();
  if (info.Length() < 1 || !info[0].IsString()) {
    TypeError::New(env, "String excepted").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  std::string name = std::string(info[0].As<String>());
  subscriptions.erase(name);
  floraAgent.unsubscribe(name.c_str());
  return env.Undefined();
}

Value ClientNative::close(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (ready) {
    floraAgent.close();
    napi_async_destroy(env, asyncContext);
    asyncContext = nullptr;
    uv_close((uv_handle_t*)&msgAsync, nullptr);
    uv_close((uv_handle_t*)&respAsync, nullptr);
    thisRef.Unref();
  }
  return env.Undefined();
}

Value ClientNative::post(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!ready)
    return Number::New(env, ERROR_INVALID_URI);
  if (info.Length() < 1 || !info[0].IsString()) {
    return Number::New(env, ERROR_INVALID_PARAM);
  }
  std::string name = info[0].As<String>().Utf8Value();
  shared_ptr<Caps> msg;
  if (info.Length() >= 2) {
    if (!info[1].IsArray()) {
      return Number::New(env, ERROR_INVALID_PARAM);
    }
    if (!genCapsByJSMsg(info[1].As<Array>(), msg)) {
      return Number::New(env, ERROR_INVALID_PARAM);
    }
  }
  uint32_t msgtype = FLORA_MSGTYPE_INSTANT;
  if (info.Length() >= 3) {
    if (info[2].IsNumber()) {
      msgtype = info[2].As<Number>().Uint32Value();
      if (msgtype >= FLORA_NUMBER_OF_MSGTYPE) {
        return Number::New(env, ERROR_INVALID_PARAM);
      }
    }
  }
  if (floraAgent.post(name.c_str(), msg, msgtype) != FLORA_CLI_SUCCESS) {
    return Number::New(env, ERROR_NOT_CONNECTED);
  }
  return Number::New(env, FLORA_CLI_SUCCESS);
}

Value ClientNative::get(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!ready)
    return Number::New(env, ERROR_INVALID_URI);
  // assert(info.Length() == 3);
  shared_ptr<Caps> msg;
  if (info[1].IsArray() && !genCapsByJSMsg(info[1].As<Array>(), msg)) {
    return Number::New(env, ERROR_INVALID_PARAM);
  }
  // uint32_t timeout = 0;
  // TODO: timeout not work correctly, need modify flora service
  // if (info[2].IsNumber())
  //   timeout = info[2].As<Number>().Uint32Value();
  shared_ptr<FunctionReference> cbr = make_shared<FunctionReference>(
      Napi::Persistent(info[2].As<Function>()));
  int32_t r = floraAgent.get(info[0].As<String>().Utf8Value().c_str(), msg,
      [this, cbr](ResponseArray& resps) {
        this->respCallback(cbr, resps);
      });
  return Number::New(env, r);
}

void ClientNative::msgCallback(const std::string& name, Napi::Env env,
    std::shared_ptr<Caps>& msg, uint32_t type, Reply* reply) {
  unique_lock<mutex> locker(cb_mutex);
  pendingMsgs.emplace_back(env);
  std::list<MsgCallbackInfo>::iterator it = --pendingMsgs.end();
  (*it).msgName = name;
  (*it).msg = msg;
  (*it).msgtype = type;
  if (type == FLORA_MSGTYPE_REQUEST) {
    (*it).reply = reply;
    uv_async_send(&msgAsync);
    while (true) {
      cb_cond.wait(locker);
      if ((*it).handled) {
        pendingMsgs.erase(it);
        break;
      }
    }
  } else {
    uv_async_send(&msgAsync);
  }
}

void ClientNative::respCallback(shared_ptr<FunctionReference> cbr,
    ResponseArray& responses) {
  cb_mutex.lock();
  pendingResponses.emplace_back();
  list<RespCallbackInfo>::iterator it = --pendingResponses.end();
  (*it).cbr = std::move(cbr);
  (*it).responses = responses;
  cb_mutex.unlock();
  uv_async_send(&respAsync);
}

static Napi::Value genJSMsgContent(Napi::Env& env, std::shared_ptr<Caps>& msg) {
  Array ret = Array::New(env);
  int32_t mtp;
  int32_t iv;
  int64_t lv;
  float fv;
  double dv;
  std::string sbv;
  std::shared_ptr<Caps> cv;
  uint32_t idx = 0;

  if (msg.get() == nullptr)
    return env.Undefined();

  while (true) {
    mtp = msg->next_type();
    if (mtp == CAPS_ERR_EOO)
      break;
    switch (mtp) {
      case CAPS_MEMBER_TYPE_INTEGER:
        msg->read(iv);
        ret[idx++] = Number::New(env, iv);
        break;
      case CAPS_MEMBER_TYPE_LONG:
        msg->read(lv);
        ret[idx++] = Number::New(env, lv);
        break;
      case CAPS_MEMBER_TYPE_FLOAT:
        msg->read(fv);
        ret[idx++] = Number::New(env, fv);
        break;
      case CAPS_MEMBER_TYPE_DOUBLE:
        msg->read(dv);
        ret[idx++] = Number::New(env, dv);
        break;
      case CAPS_MEMBER_TYPE_STRING:
        msg->read_string(sbv);
        ret[idx++] = String::New(env, sbv);
        break;
      // iotjs not support ArrayBuffer
      // case CAPS_MEMBER_TYPE_BINARY:
      //   msg->read_binary(sbv);
      //   ret[idx++] = ArrayBuffer::New(env, (void*)sbv.data(), sbv.length());
      //   break;
      case CAPS_MEMBER_TYPE_OBJECT:
        msg->read(cv);
        ret[idx++] = genJSMsgContent(env, cv);
        break;
    }
  }
  return ret;
}

static bool genCapsByJSMsg(Array&& jsmsg, shared_ptr<Caps>& caps) {
  caps = Caps::new_instance();
  uint32_t len = jsmsg.Length();
  uint32_t i;
  Napi::Value v;

  for (i = 0; i < len; ++i) {
    v = jsmsg[i];
    if (v.IsNumber()) {
      caps->write(v.As<Number>().DoubleValue());
    } else if (v.IsString()) {
      caps->write(v.As<String>().Utf8Value().c_str());
    // iotjs not support ArrayBuffer
    // } else if (v.IsArrayBuffer()) {
    //   caps->write(v.As<ArrayBuffer>().Data(), v.As<ArrayBuffer>().ByteLength());
    } else if (v.IsArray()) {
      shared_ptr<Caps> sub;
      if (!genCapsByJSMsg(v.As<Array>(), sub))
        return false;
      caps->write(sub);
    } else
      return false;
  }
  return true;
}

static void genReplyByJSObject(Napi::Value& jsv, Reply& reply) {
  if (!jsv.IsObject())
    return;
  Napi::Value m = jsv.As<Object>().Get("retCode");
  if (!m.IsNumber())
    return;
  reply.ret_code = (int32_t)(m.As<Number>());
  m = jsv.As<Object>().Get("msg");
  if (m.IsArray()) {
    if (!genCapsByJSMsg(m.As<Array>(), reply.data))
      reply.data.reset();
  }
}

void ClientNative::handleMsgCallbacks() {
  Napi::Value jsmsg;
  SubscriptionMap::iterator subit;
  Napi::Value cbret;
  unique_lock<mutex> locker(cb_mutex, defer_lock);

  while (true) {
    locker.lock();
    if (pendingMsgs.empty())
      break;
    MsgCallbackInfo cbinfo(pendingMsgs.front());
    locker.unlock();

    HandleScope scope(cbinfo.env);
    jsmsg = genJSMsgContent(cbinfo.env, cbinfo.msg);
    subit = subscriptions.find(cbinfo.msgName);
    if (subit != subscriptions.end()) {
      cbret = subit->second.MakeCallback(cbinfo.env.Global(),
          { jsmsg, Number::New(cbinfo.env, cbinfo.msgtype) }, asyncContext);
    }
    if (cbinfo.msgtype == FLORA_MSGTYPE_REQUEST) {
      genReplyByJSObject(cbret, *(cbinfo.reply));
      locker.lock();
      pendingMsgs.front().handled = true;
      cb_cond.notify_all();
      locker.unlock();
    } else {
      locker.lock();
      pendingMsgs.pop_front();
      locker.unlock();
    }
  }
}

static Value genJSResponseArray(Napi::Env env, ResponseArray& resps) {
  EscapableHandleScope scope(env);
  Array result;
  Object ele;
  uint32_t i;

  result = Array::New(env, resps.size());
  for (i = 0; i < resps.size(); ++i) {
    ele = Object::New(env);
    Response& resp = resps[i];
    ele["retCode"] = Number::New(env, resp.ret_code);
    ele["msg"] = genJSMsgContent(env, resp.data);
    ele["sender"] = String::New(env, resp.extra);
    result[i] = ele;
  }
  return scope.Escape(result);
}

void ClientNative::handleRespCallbacks() {
  Napi::Value jsresps;
  unique_lock<mutex> locker(cb_mutex, defer_lock);
  list<RespCallbackInfo>::iterator it;

  while (true) {
    locker.lock();
    if (pendingResponses.empty())
      break;
    it = pendingResponses.begin();
    locker.unlock();

    HandleScope scope((*it).cbr->Env());
    jsresps = genJSResponseArray((*it).cbr->Env(), (*it).responses);
    (*it).cbr->MakeCallback((*it).cbr->Env().Global(), { jsresps }, asyncContext);

    locker.lock();
    pendingResponses.pop_front();
    locker.unlock();
  }
}

static Object InitNode(Napi::Env env, Object exports) {
  return ClientNative::Init(env, exports);
}

NODE_API_MODULE(flora, InitNode);
