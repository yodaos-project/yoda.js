#include <utility>
#include <chrono>
#include "cli-native.h"

#define ERROR_INVALID_URI -1
#define ERROR_INVALID_PARAM -2
#define ERROR_NOT_CONNECTED -3

using namespace std;
using namespace Napi;
using namespace flora;

static bool genCapsByJSArray(Array&& jsmsg, shared_ptr<Caps>& caps);
static bool genCapsByJSCaps(Object&& jsmsg, shared_ptr<Caps>& caps);
static Napi::Value genJSArrayByCaps(Napi::Env& env, std::shared_ptr<Caps>& msg);

static void msg_async_cb(uv_async_t* handle) {
  ClientNative* _this = reinterpret_cast<ClientNative*>(handle->data);
  _this->handleMsgCallbacks();
}

static void resp_async_cb(uv_async_t* handle) {
  ClientNative* _this = reinterpret_cast<ClientNative*>(handle->data);
  _this->handleRespCallbacks();
}

static void async_close_cb(uv_handle_t* handle) {
  uv_async_t* ah = reinterpret_cast<uv_async_t*>(handle);
  reinterpret_cast<ClientNative*>(ah->data)->refDown();
}

Object NativeObjectWrap::Init(Napi::Env env, Object exports) {
  HandleScope scope(env);

  Function ctor =
      DefineClass(env, "ClientNative",
                  { InstanceMethod("start", &NativeObjectWrap::start),
                    InstanceMethod("nativeSubscribe",
                                   &NativeObjectWrap::subscribe),
                    InstanceMethod("unsubscribe",
                                   &NativeObjectWrap::unsubscribe),
                    InstanceMethod("close", &NativeObjectWrap::close),
                    InstanceMethod("nativeGenArray",
                                   &NativeObjectWrap::genArray),
                    InstanceMethod("nativePost", &NativeObjectWrap::post),
                    InstanceMethod("nativeGet", &NativeObjectWrap::get) });
  exports.Set("Agent", ctor);
  return exports;
}

NativeObjectWrap::NativeObjectWrap(const CallbackInfo& info)
    : ObjectWrap<NativeObjectWrap>(info) {
  thisClient = new ClientNative();
  thisClient->initialize(info);
}

NativeObjectWrap::~NativeObjectWrap() {
  thisClient->close();
}

Napi::Value NativeObjectWrap::start(const Napi::CallbackInfo& info) {
  return thisClient->start(info);
}

Napi::Value NativeObjectWrap::subscribe(const Napi::CallbackInfo& info) {
  return thisClient->subscribe(info);
}

Napi::Value NativeObjectWrap::unsubscribe(const Napi::CallbackInfo& info) {
  return thisClient->unsubscribe(info);
}

Napi::Value NativeObjectWrap::close(const Napi::CallbackInfo& info) {
  thisClient->close();
  return info.Env().Undefined();
}

Napi::Value NativeObjectWrap::post(const Napi::CallbackInfo& info) {
  return thisClient->post(info);
}

Napi::Value NativeObjectWrap::get(const Napi::CallbackInfo& info) {
  return thisClient->get(info);
}

Napi::Value NativeObjectWrap::genArray(const Napi::CallbackInfo& info) {
  return thisClient->genArray(info);
}

void ClientNative::initialize(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  thisEnv = env;
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
  status |= NATIVE_STATUS_CONFIGURED;
}

Value ClientNative::start(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if ((status & NATIVE_STATUS_CONFIGURED) &&
      !(status & NATIVE_STATUS_STARTED)) {
    msgAsync.data = this;
    uv_async_init(uv_default_loop(), &msgAsync, msg_async_cb);
    respAsync.data = this;
    uv_async_init(uv_default_loop(), &respAsync, resp_async_cb);
    napi_async_init(env, info.This(), String::New(env, "flora-agent"),
                    &asyncContext);
    floraAgent.start();
    thisRef = Napi::Persistent(info.This());
    status |= NATIVE_STATUS_STARTED;
  }
  return env.Undefined();
}

Value ClientNative::subscribe(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!(status & NATIVE_STATUS_CONFIGURED))
    return env.Undefined();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsFunction()) {
    TypeError::New(env, "String, Function excepted")
        .ThrowAsJavaScriptException();
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
  floraAgent.subscribe(name.c_str(),
                       [this, name, env](std::shared_ptr<Caps>& msg,
                                         uint32_t type, Reply* reply) {
                         this->msgCallback(name, env, msg, type, reply);
                       });
  return env.Undefined();
}

Value ClientNative::unsubscribe(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!(status & NATIVE_STATUS_CONFIGURED))
    return env.Undefined();
  if (info.Length() < 1 || !info[0].IsString()) {
    TypeError::New(env, "String excepted").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  std::string name = std::string(info[0].As<String>());
  SubscriptionMap::iterator it = subscriptions.find(name);
  if (it != subscriptions.end()) {
    it->second.Unref();
    subscriptions.erase(it);
  }
  floraAgent.unsubscribe(name.c_str());
  return env.Undefined();
}

void ClientNative::close() {
  if ((status & NATIVE_STATUS_CONFIGURED) && (status & NATIVE_STATUS_STARTED)) {
    SubscriptionMap::iterator subit;

    floraAgent.close();
    uv_close((uv_handle_t*)&msgAsync, async_close_cb);
    uv_close((uv_handle_t*)&respAsync, async_close_cb);
    for (subit = subscriptions.begin(); subit != subscriptions.end(); ++subit) {
      subit->second.Unref();
    }
    subscriptions.clear();
    thisRef.Unref();
    napi_async_destroy(thisEnv, asyncContext);
    asyncContext = nullptr;
    status &= (~NATIVE_STATUS_STARTED);
  }
}

Value ClientNative::post(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!(status & NATIVE_STATUS_CONFIGURED))
    return Number::New(env, ERROR_INVALID_URI);
  std::string name = info[0].As<String>().Utf8Value();
  shared_ptr<Caps> msg;

  // msg is Caps object
  if (info[3].As<Boolean>().Value()) {
    if (!genCapsByJSCaps(info[1].As<Object>(), msg)) {
      return Number::New(env, ERROR_INVALID_PARAM);
    }
  } else {
    if (info[1].IsArray() && !genCapsByJSArray(info[1].As<Array>(), msg)) {
      return Number::New(env, ERROR_INVALID_PARAM);
    }
  }
  uint32_t msgtype = FLORA_MSGTYPE_INSTANT;
  if (info[2].IsNumber()) {
    msgtype = info[2].As<Number>().Uint32Value();
  }
  if (floraAgent.post(name.c_str(), msg, msgtype) != FLORA_CLI_SUCCESS) {
    return Number::New(env, ERROR_NOT_CONNECTED);
  }
  return Number::New(env, FLORA_CLI_SUCCESS);
}

Value ClientNative::get(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!(status & NATIVE_STATUS_CONFIGURED))
    return Number::New(env, ERROR_INVALID_URI);
  // assert(info.Length() == 3);
  shared_ptr<Caps> msg;
  // msg is Array or Caps object
  if (info[1].IsArray() && !genCapsByJSArray(info[1].As<Array>(), msg)) {
    return Number::New(env, ERROR_INVALID_PARAM);
  } else if (info[1].IsExternal() &&
             !genCapsByJSCaps(info[1].As<Object>(), msg)) {
    return Number::New(env, ERROR_INVALID_PARAM);
  }
  // uint32_t timeout = 0;
  // TODO: timeout not work correctly, need modify flora service
  // if (info[2].IsNumber())
  //   timeout = info[2].As<Number>().Uint32Value();
  shared_ptr<FunctionReference> cbr =
      make_shared<FunctionReference>(Napi::Persistent(info[2].As<Function>()));
  // TODO: if callback of flora.get never invokded, the FunctionReference will
  // never Unref!!
  int32_t r = floraAgent.get(info[0].As<String>().Utf8Value().c_str(), msg,
                             [this, cbr](ResponseArray& resps) {
                               this->respCallback(cbr, resps);
                             });
  return Number::New(env, r);
}

Value ClientNative::genArray(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!info[0].IsExternal())
    return env.Undefined();
  HackedNativeCaps* hackedCaps = nullptr;
  if (napi_unwrap(env, info[0], (void**)&hackedCaps) != napi_ok ||
      hackedCaps == nullptr) {
    return env.Undefined();
  }
  return genJSArrayByCaps(env, hackedCaps->caps);
}

void ClientNative::msgCallback(const std::string& name, Napi::Env env,
                               std::shared_ptr<Caps>& msg, uint32_t type,
                               Reply* reply) {
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

void ClientNative::refDown() {
  --asyncHandleCount;
  if (asyncHandleCount == 0)
    delete this;
}

static Napi::Value genJSArrayByCaps(Napi::Env& env,
                                    std::shared_ptr<Caps>& msg) {
  Array ret = Array::New(env);
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
    int32_t mtp = msg->next_type();
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
        ret[idx++] = genJSArrayByCaps(env, cv);
        break;
    }
  }
  return ret;
}

static bool genCapsByJSArray(Array&& jsmsg, shared_ptr<Caps>& caps) {
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
      //   caps->write(v.As<ArrayBuffer>().Data(),
      //   v.As<ArrayBuffer>().ByteLength());
    } else if (v.IsArray()) {
      shared_ptr<Caps> sub;
      if (!genCapsByJSArray(v.As<Array>(), sub))
        return false;
      caps->write(sub);
    } else
      return false;
  }
  return true;
}

static bool genCapsByJSCaps(Object&& jsmsg, shared_ptr<Caps>& caps) {
  void* ptr = nullptr;
  napi_unwrap(jsmsg.Env(), jsmsg, &ptr);
  if (ptr == nullptr)
    return false;
  caps = reinterpret_cast<HackedNativeCaps*>(ptr)->caps;
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
    if (!genCapsByJSArray(m.As<Array>(), reply.data))
      reply.data.reset();
  } else if (m.IsObject()) {
    if (!genCapsByJSCaps(m.As<Object>(), reply.data))
      reply.data.reset();
  }
}

static void freeHackedCaps(napi_env, void* data, void* arg) {
  delete reinterpret_cast<HackedNativeCaps*>(data);
}

static napi_value genHackedCaps(napi_env env, shared_ptr<Caps> msg) {
  napi_value jsobj;
  if (napi_create_object(env, &jsobj) != napi_ok) {
    napi_get_undefined(env, &jsobj);
    return jsobj;
  }
  HackedNativeCaps* hackedCaps = new HackedNativeCaps();
  hackedCaps->caps = msg;
  napi_wrap(env, jsobj, hackedCaps, freeHackedCaps, nullptr, nullptr);
  return jsobj;
}

void ClientNative::handleMsgCallbacks() {
  napi_value jsmsg;
  SubscriptionMap::iterator subit;
  Napi::Value cbret;
  unique_lock<mutex> locker(cb_mutex);
  list<MsgCallbackInfo>::iterator mit = pendingMsgs.begin();
  list<MsgCallbackInfo>::iterator rmit;
  locker.unlock();

  while (true) {
    locker.lock();
    if (mit == pendingMsgs.end())
      break;
    MsgCallbackInfo cbinfo(*mit);
    locker.unlock();

    HandleScope scope(cbinfo.env);
    jsmsg = genHackedCaps(cbinfo.env, cbinfo.msg);
    subit = subscriptions.find(cbinfo.msgName);
    if (subit != subscriptions.end()) {
      cbret = subit->second.MakeCallback(cbinfo.env.Global(),
                                         { jsmsg, Number::New(cbinfo.env,
                                                              cbinfo.msgtype) },
                                         asyncContext);
    }
    if (cbinfo.msgtype == FLORA_MSGTYPE_REQUEST) {
      genReplyByJSObject(cbret, *(cbinfo.reply));
      locker.lock();
      (*mit).handled = true;
      ++mit;
      cb_cond.notify_all();
      locker.unlock();
    } else {
      locker.lock();
      rmit = mit;
      ++mit;
      pendingMsgs.erase(rmit);
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
    ele["msg"] = genHackedCaps(env, resp.data);
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
    (*it).cbr->MakeCallback((*it).cbr->Env().Global(), { jsresps },
                            asyncContext);

    locker.lock();
    (*it).cbr->Unref();
    pendingResponses.pop_front();
    locker.unlock();
  }
}

static Object InitNode(Napi::Env env, Object exports) {
  return NativeObjectWrap::Init(env, exports);
}

NODE_API_MODULE(flora, InitNode);
