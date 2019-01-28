#include <utility>
#include <chrono>
#include "cli-native.h"

#define ERROR_INVALID_URI -1
#define ERROR_INVALID_PARAM -2
#define ERROR_NOT_CONNECTED -3

using namespace std;
using namespace Napi;
using namespace flora;

static bool genCapsByJSArray(napi_env env, napi_value jsmsg,
                             shared_ptr<Caps>& caps);
static bool genCapsByJSCaps(napi_env env, napi_value jsmsg,
                            shared_ptr<Caps>& caps);
static Napi::Value genJSArrayByCaps(Napi::Env& env, std::shared_ptr<Caps>& msg);

napi_ref NativeReply::replyConstructor;

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
                    InstanceMethod("nativeDeclareMethod",
                                   &NativeObjectWrap::declareMethod),
                    InstanceMethod("removeMethod",
                                   &NativeObjectWrap::removeMethod),
                    InstanceMethod("close", &NativeObjectWrap::close),
                    InstanceMethod("nativeGenArray",
                                   &NativeObjectWrap::genArray),
                    InstanceMethod("nativePost", &NativeObjectWrap::post),
                    InstanceMethod("nativeCall", &NativeObjectWrap::call) });
  exports.Set("Agent", ctor);
  return exports;
}

NativeObjectWrap::NativeObjectWrap(const CallbackInfo& info)
    : ObjectWrap<NativeObjectWrap>(info) {
  thisClient = new ClientNative();
  thisClient->initialize(info);
}

NativeObjectWrap::~NativeObjectWrap() {
  if (thisClient) {
    thisClient->close();
  }
}

Napi::Value NativeObjectWrap::start(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return info.Env().Undefined();
  return thisClient->start(info);
}

Napi::Value NativeObjectWrap::subscribe(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return info.Env().Undefined();
  return thisClient->subscribe(info);
}

Napi::Value NativeObjectWrap::unsubscribe(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return info.Env().Undefined();
  return thisClient->unsubscribe(info);
}

Napi::Value NativeObjectWrap::declareMethod(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return info.Env().Undefined();
  return thisClient->declareMethod(info);
}

Napi::Value NativeObjectWrap::removeMethod(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return info.Env().Undefined();
  return thisClient->removeMethod(info);
}

Napi::Value NativeObjectWrap::close(const Napi::CallbackInfo& info) {
  ClientNative* tmp = thisClient;
  if (tmp) {
    thisClient = nullptr;
    tmp->close();
  }
  return info.Env().Undefined();
}

Napi::Value NativeObjectWrap::post(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return Number::New(info.Env(), ERROR_NOT_CONNECTED);
  return thisClient->post(info);
}

Napi::Value NativeObjectWrap::call(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return Number::New(info.Env(), ERROR_NOT_CONNECTED);
  return thisClient->call(info);
}

Napi::Value NativeObjectWrap::genArray(const Napi::CallbackInfo& info) {
  if (thisClient == nullptr)
    return info.Env().Undefined();
  return thisClient->genArray(info);
}

#define DEFAULT_RECONN_INTERVAL 10000
#define DEFAULT_BUFSIZE 32768
typedef struct {
  uint32_t reconnInterval;
  uint32_t bufsize;
} AgentOptions;

static void parseAgentOptions(const Napi::Value& jsopts,
                              AgentOptions& cxxopts) {
  if (jsopts.IsObject()) {
    Napi::Value v = jsopts.As<Object>().Get("reconnInterval");
    if (v.IsNumber()) {
      cxxopts.reconnInterval = v.As<Number>().Uint32Value();
    } else {
      cxxopts.reconnInterval = DEFAULT_RECONN_INTERVAL;
    }
    v = jsopts.As<Object>().Get("bufsize");
    if (v.IsNumber()) {
      cxxopts.bufsize = v.As<Number>().Uint32Value();
    } else {
      cxxopts.bufsize = DEFAULT_BUFSIZE;
    }
  } else {
    cxxopts.reconnInterval = DEFAULT_RECONN_INTERVAL;
    cxxopts.bufsize = DEFAULT_BUFSIZE;
  }
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

  AgentOptions opts;
  parseAgentOptions(info[1], opts);
  floraAgent.config(FLORA_AGENT_CONFIG_RECONN_INTERVAL, opts.reconnInterval);
  floraAgent.config(FLORA_AGENT_CONFIG_BUFSIZE, opts.bufsize);
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
                       [this, env](const char* name, std::shared_ptr<Caps>& msg,
                                   uint32_t type) {
                         this->msgCallback(name, env, msg, type, nullptr);
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

Value ClientNative::declareMethod(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!(status & NATIVE_STATUS_CONFIGURED))
    return env.Undefined();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsFunction()) {
    TypeError::New(env, "String, Function excepted")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  std::string name = std::string(info[0].As<String>());
  if (remoteMethods.find(name) != remoteMethods.end())
    return env.Undefined();
  Function cb = info[1].As<Function>();
  auto r = remoteMethods.insert(std::make_pair(name, Napi::Persistent(cb)));
  if (!r.second) {
    return env.Undefined();
  }
  floraAgent.declare_method(name.c_str(),
                            [this, env](const char* name, shared_ptr<Caps>& msg,
                                        shared_ptr<Reply>& reply) {
                              this->msgCallback(name, env, msg, 0xffffffff,
                                                reply);
                            });
  return env.Undefined();
}

Value ClientNative::removeMethod(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!(status & NATIVE_STATUS_CONFIGURED))
    return env.Undefined();
  if (info.Length() < 1 || !info[0].IsString()) {
    TypeError::New(env, "String excepted").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  std::string name = std::string(info[0].As<String>());
  SubscriptionMap::iterator it = remoteMethods.find(name);
  if (it != remoteMethods.end()) {
    it->second.Unref();
    remoteMethods.erase(it);
  }
  floraAgent.remove_method(name.c_str());
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
    if (!genCapsByJSCaps(env, info[1], msg)) {
      return Number::New(env, ERROR_INVALID_PARAM);
    }
  } else {
    if (info[1].IsArray() && !genCapsByJSArray(env, info[1], msg)) {
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

Value ClientNative::call(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!(status & NATIVE_STATUS_CONFIGURED))
    return Number::New(env, ERROR_INVALID_URI);
  // assert(info.Length() == 3);
  shared_ptr<Caps> msg;
  // msg is Caps object
  if (info[4].As<Boolean>().Value()) {
    if (!genCapsByJSCaps(env, info[1], msg)) {
      return Number::New(env, ERROR_INVALID_PARAM);
    }
  } else {
    if (info[1].IsArray() && !genCapsByJSArray(env, info[1], msg)) {
      return Number::New(env, ERROR_INVALID_PARAM);
    }
  }
  uint32_t timeout = 0;
  if (info[5].IsNumber()) {
    timeout = info[5].As<Number>().Uint32Value();
  }
  shared_ptr<FunctionReference> cbr =
      make_shared<FunctionReference>(Napi::Persistent(info[3].As<Function>()));
  // TODO: if callback of flora.get never invokded, the FunctionReference will
  // never Unref!!
  int32_t r = floraAgent.call(info[0].As<String>().Utf8Value().c_str(), msg,
                              info[2].As<String>().Utf8Value().c_str(),
                              [this, cbr](int32_t rescode, Response& resp) {
                                this->respCallback(cbr, rescode, resp);
                              },
                              timeout);
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

void ClientNative::msgCallback(const char* name, Napi::Env env,
                               std::shared_ptr<Caps>& msg, uint32_t type,
                               shared_ptr<Reply> reply) {
  unique_lock<mutex> locker(cb_mutex);
  pendingMsgs.emplace_back(env);
  std::list<MsgCallbackInfo>::iterator it = --pendingMsgs.end();
  (*it).msgName = name;
  (*it).msg = msg;
  (*it).msgtype = type;
  if (type >= FLORA_NUMBER_OF_MSGTYPE) {
    (*it).reply = reply;
  }
  uv_async_send(&msgAsync);
}

void ClientNative::respCallback(shared_ptr<FunctionReference> cbr,
                                int32_t rescode, Response& response) {
  cb_mutex.lock();
  pendingResponses.emplace_back();
  list<RespCallbackInfo>::iterator it = --pendingResponses.end();
  (*it).cbr = std::move(cbr);
  (*it).rescode = rescode;
  (*it).response = response;
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
      case CAPS_MEMBER_TYPE_VOID:
        msg->read();
        ret[idx++] = env.Undefined();
        break;
    }
  }
  return ret;
}

static bool genCapsByJSArray(napi_env env, napi_value jsmsg,
                             shared_ptr<Caps>& caps) {
  caps = Caps::new_instance();
  uint32_t len;
  uint32_t i;
  napi_value v;
  napi_valuetype tp;

  napi_get_array_length(env, jsmsg, &len);
  for (i = 0; i < len; ++i) {
    napi_get_element(env, jsmsg, i, &v);
    napi_typeof(env, v, &tp);
    if (tp == napi_number) {
      double d;
      napi_get_value_double(env, v, &d);
      caps->write(d);
    } else if (tp == napi_string) {
      size_t strlen;
      char* str;
      napi_get_value_string_utf8(env, v, nullptr, 0, &strlen);
      str = new char[strlen + 1];
      napi_get_value_string_utf8(env, v, str, strlen, nullptr);
      str[strlen] = '\0';
      caps->write(str);
      delete[] str;
      // iotjs not support ArrayBuffer
      // } else if (v.IsArrayBuffer()) {
      //   caps->write(v.As<ArrayBuffer>().Data(),
      //   v.As<ArrayBuffer>().ByteLength());
    } else if (tp == napi_object) {
      bool isArray;
      napi_is_array(env, v, &isArray);
      if (!isArray)
        return false;
      shared_ptr<Caps> sub;
      if (!genCapsByJSArray(env, v, sub))
        return false;
      caps->write(sub);
    } else if (tp == napi_undefined) {
      caps->write();
    } else
      return false;
  }
  return true;
}

static bool genCapsByJSCaps(napi_env env, napi_value jsmsg,
                            shared_ptr<Caps>& caps) {
  void* ptr = nullptr;
  napi_unwrap(env, jsmsg, &ptr);
  if (ptr == nullptr)
    return false;
  caps = reinterpret_cast<HackedNativeCaps*>(ptr)->caps;
  return true;
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
    if (cbinfo.msgtype < FLORA_NUMBER_OF_MSGTYPE) {
      subit = subscriptions.find(cbinfo.msgName);
      if (subit != subscriptions.end()) {
        subit->second.MakeCallback(cbinfo.env.Global(),
                                   { jsmsg,
                                     Number::New(cbinfo.env, cbinfo.msgtype) },
                                   asyncContext);
      }
    } else {
      subit = remoteMethods.find(cbinfo.msgName);
      if (subit != remoteMethods.end()) {
        napi_value jsreply =
            NativeReply::createObject(cbinfo.env, cbinfo.reply);
        subit->second.MakeCallback(cbinfo.env.Global(), { jsmsg, jsreply },
                                   asyncContext);
      }
    }
    locker.lock();
    rmit = mit;
    ++mit;
    pendingMsgs.erase(rmit);
    locker.unlock();
  }
}

static Value genJSResponse(Napi::Env env, Response& resp) {
  EscapableHandleScope scope(env);
  Object jsresp;

  jsresp = Object::New(env);
  jsresp["retCode"] = Number::New(env, resp.ret_code);
  jsresp["msg"] = genHackedCaps(env, resp.data);
  jsresp["sender"] = String::New(env, resp.extra);
  return scope.Escape(jsresp);
}

void ClientNative::handleRespCallbacks() {
  Napi::Value jsresp;
  unique_lock<mutex> locker(cb_mutex, defer_lock);
  list<RespCallbackInfo>::iterator it;

  while (true) {
    locker.lock();
    if (pendingResponses.empty())
      break;
    it = pendingResponses.begin();
    locker.unlock();

    HandleScope scope((*it).cbr->Env());
    jsresp = genJSResponse((*it).cbr->Env(), (*it).response);
    (*it).cbr->MakeCallback((*it).cbr->Env().Global(),
                            { Number::New((*it).cbr->Env(), (*it).rescode),
                              jsresp },
                            asyncContext);

    locker.lock();
    (*it).cbr->Unref();
    pendingResponses.pop_front();
    locker.unlock();
  }
}

void NativeReply::init(napi_env env) {
  napi_handle_scope scope;
  napi_open_handle_scope(env, &scope);

  napi_value cons;
  napi_create_function(env, "Reply", NAPI_AUTO_LENGTH, NativeReply::newInstance,
                       nullptr, &cons);
  napi_value proto;
  napi_create_object(env, &proto);
  napi_value jsfunc;
  napi_create_function(env, "writeCode", NAPI_AUTO_LENGTH,
                       NativeReply::writeCodeStatic, nullptr, &jsfunc);
  napi_set_named_property(env, proto, "writeCode", jsfunc);
  napi_create_function(env, "writeData", NAPI_AUTO_LENGTH,
                       NativeReply::writeDataStatic, nullptr, &jsfunc);
  napi_set_named_property(env, proto, "writeData", jsfunc);
  napi_create_function(env, "end", NAPI_AUTO_LENGTH, NativeReply::endStatic,
                       nullptr, &jsfunc);
  napi_set_named_property(env, proto, "end", jsfunc);
  napi_set_named_property(env, cons, "prototype", proto);
  napi_create_reference(env, cons, 1, &replyConstructor);

  napi_close_handle_scope(env, scope);
}

napi_value NativeReply::newInstance(napi_env env, napi_callback_info cbinfo) {
  napi_value thisObj;
  napi_get_cb_info(env, cbinfo, nullptr, nullptr, &thisObj, nullptr);
  return thisObj;
}

napi_value NativeReply::createObject(napi_env env,
                                     shared_ptr<flora::Reply>& reply) {
  napi_escapable_handle_scope scope;
  napi_open_escapable_handle_scope(env, &scope);

  napi_value res, cons;
  napi_get_reference_value(env, replyConstructor, &cons);
  napi_new_instance(env, cons, 0, nullptr, &res);
  NativeReply* nativeReply = new NativeReply(reply);
  napi_wrap(env, res, nativeReply, NativeReply::objectFinalize, nullptr,
            nullptr);

  napi_escape_handle(env, scope, res, &res);
  napi_close_escapable_handle_scope(env, scope);
  return res;
}

void NativeReply::objectFinalize(napi_env env, void* data, void* hint) {
  delete reinterpret_cast<NativeReply*>(data);
}

#define MAX_NATIVE_ARGS 16
napi_value NativeReply::callNativeMethod(napi_env env,
                                         napi_callback_info cbinfo,
                                         NapiCallbackFunc cb) {
  napi_escapable_handle_scope scope;
  napi_open_escapable_handle_scope(env, &scope);

  napi_value thisObj;
  size_t argc = MAX_NATIVE_ARGS;
  napi_value argv[MAX_NATIVE_ARGS];
  napi_get_cb_info(env, cbinfo, &argc, argv, &thisObj, nullptr);
  void* data;
  napi_unwrap(env, thisObj, &data);
  napi_value r =
      (reinterpret_cast<NativeReply*>(data)->*cb)(env, thisObj, argc, argv);

  napi_escape_handle(env, scope, r, &r);
  napi_close_escapable_handle_scope(env, scope);
  return r;
}

napi_value NativeReply::writeCodeStatic(napi_env env,
                                        napi_callback_info cbinfo) {
  return callNativeMethod(env, cbinfo, &NativeReply::writeCode);
}

napi_value NativeReply::writeDataStatic(napi_env env,
                                        napi_callback_info cbinfo) {
  return callNativeMethod(env, cbinfo, &NativeReply::writeData);
}

napi_value NativeReply::endStatic(napi_env env, napi_callback_info cbinfo) {
  return callNativeMethod(env, cbinfo, &NativeReply::end);
}

napi_value NativeReply::writeCode(napi_env env, napi_value thisObj, size_t argc,
                                  napi_value* argv) {
  if (argc >= 1) {
    napi_valuetype tp;
    napi_typeof(env, argv[0], &tp);
    if (tp == napi_number) {
      int32_t code;
      napi_get_value_int32(env, argv[0], &code);
      reply->write_code(code);
    }
  }
  napi_value r;
  napi_get_undefined(env, &r);
  return r;
}

napi_value NativeReply::writeData(napi_env env, napi_value thisObj, size_t argc,
                                  napi_value* argv) {
  if (argc >= 1) {
    bool isArray;
    shared_ptr<Caps> caps;
    napi_is_array(env, argv[0], &isArray);
    if (isArray) {
      if (!genCapsByJSArray(env, argv[0], caps))
        goto exit;
    } else {
      napi_valuetype tp;
      void* data;
      napi_typeof(env, argv[0], &tp);
      if (tp != napi_object || tp != napi_external)
        goto exit;
      if (!genCapsByJSCaps(env, argv[0], caps))
        goto exit;
    }
    reply->write_data(caps);
  }

exit:
  napi_value r;
  napi_get_undefined(env, &r);
  return r;
}

napi_value NativeReply::end(napi_env env, napi_value thisObj, size_t argc,
                            napi_value* argv) {
  if (argc >= 1) {
    writeCode(env, thisObj, 1, argv);
  }
  if (argc >= 2) {
    writeData(env, thisObj, 1, argv + 1);
  }
  reply->end();
  napi_value r;
  napi_get_undefined(env, &r);
  return r;
}

static Object InitNode(Napi::Env env, Object exports) {
  NativeReply::init(env);
  return NativeObjectWrap::Init(env, exports);
}

NODE_API_MODULE(flora, InitNode);
