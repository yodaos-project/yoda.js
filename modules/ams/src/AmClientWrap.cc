#include <uv.h>
#include "AmClientWrap.h"

using namespace std;
using namespace v8;

uv_async_t* async = new uv_async_t;
uv_mutex_t async_lock;

void AsyncCallback(uv_async_t* handle) {
  Nan::HandleScope scope;
  AmClientWrap* client = static_cast<AmClientWrap*>(handle->data);

  size_t num = 1 + client->args.size();
  Local<Value> argv[num];
  argv[0] = Nan::New(const_cast<char*>(client->event)).ToLocalChecked();

  size_t idx = 1;
  for (auto &item : client->args) {
    argv[idx] = Nan::New(item).ToLocalChecked();
    idx += 1;
  }
  client->callback->Call(num, argv);
  client->args.resize(0);
  uv_mutex_unlock(&async_lock);

  // if (amclient->event == "destroy") {
  //   uv_unref((uv_handle_t*)handle);
  // }
}

class AmClientBase : public NativeBase {
public:
  AmClientBase(const char* name) : NativeBase(name) {
    // TODO
  }
  bool onCreate(const std::string& ctx) {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "create";
    client->args.push_back(strdup(ctx.c_str()));
    uv_async_send(async);
    return true;
  }
  bool onRestart(const std::string& ctx) {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "restart";
    client->args.push_back(strdup(ctx.c_str()));
    uv_async_send(async);
    return true;
  }
  bool onRevival(const std::string& ctx) {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "revival";
    client->args.push_back(strdup(ctx.c_str()));
    uv_async_send(async);
    return true;
  }
  bool onResume() {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "resume";
    uv_async_send(async);
    return true;
  }
  bool onPause() {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "pause";
    uv_async_send(async);
    return true;
  }
  bool onStop() {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "stop";
    uv_async_send(async);
    return true;
  }
  bool onDestroy() {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "destroy";
    uv_async_send(async);
    return true;
  }
  bool onRapture() {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "rapture";
    uv_async_send(async);
    return true;
  }
  bool onEvent(const std::string& event) {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "event";
    client->args.push_back(strdup(event.c_str()));
    uv_async_send(async);
    return true;
  }
  bool onVoiceCommand(const std::string& asr, const std::string& nlp, const std::string& action) {
    uv_mutex_lock(&async_lock);
    AmClientWrap* client = static_cast<AmClientWrap*>(async->data);
    client->event = "voice_command";
    client->args.push_back(strdup(asr.c_str()));
    client->args.push_back(strdup(nlp.c_str()));
    client->args.push_back(strdup(action.c_str()));
    uv_async_send(async);
    return true;
  }
};

AmClientWrap::AmClientWrap() {
  // TODO
}

AmClientWrap::~AmClientWrap() {
  callback->Reset();
}

NAN_MODULE_INIT(AmClientWrap::Init) {
  // set ams
  Local<FunctionTemplate> tmpl = Nan::New<FunctionTemplate>(New);
  tmpl->SetClassName(Nan::New("AmClientWrap").ToLocalChecked());
  tmpl->InstanceTemplate()->SetInternalFieldCount(1);
  Nan::SetPrototypeMethod(tmpl, "start", Start);
  Nan::SetPrototypeMethod(tmpl, "stop", Stop);
  Nan::SetPrototypeMethod(tmpl, "finish", Finish);
  Nan::SetPrototypeMethod(tmpl, "_openSiren", OpenSiren);

  Local<Function> func = Nan::GetFunction(tmpl).ToLocalChecked();
  Nan::Set(target, Nan::New("AmClientWrap").ToLocalChecked(), func);
}

NAN_METHOD(AmClientWrap::New) {
  v8::String::Utf8Value appidStr(info[0]);
  AmClientWrap* amclient = new AmClientWrap();
  amclient->appid = strdup(*appidStr);
  amclient->callback = new Nan::Callback(info[1].As<Function>());
  amclient->Wrap(info.This());

  uv_mutex_init(&async_lock);
  uv_async_init(uv_default_loop(), async, AsyncCallback);
  async->data = (void*)amclient;
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AmClientWrap::Start) {
  AmClientWrap* client = Nan::ObjectWrap::Unwrap<AmClientWrap>(info.This());
  client->worker.data = (void*)client;

  // TODO(Yazhong): return the value of `uv_queue_work`.
  uv_queue_work(
    uv_default_loop(), 
    &client->worker, 
    AsyncExecute, 
    AsyncExecuteComplete);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AmClientWrap::Stop) {
  AmClientWrap* client = Nan::ObjectWrap::Unwrap<AmClientWrap>(info.This());
  uv_cancel((uv_req_t*)&client->worker);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AmClientWrap::Finish) {
  AmClientWrap* client = Nan::ObjectWrap::Unwrap<AmClientWrap>(info.This());
  client->native_->Finish();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AmClientWrap::OpenSiren) {
  AmClientWrap* client = Nan::ObjectWrap::Unwrap<AmClientWrap>(info.This());
  bool val = info[0]->BooleanValue();
  client->native_->OpenSiren(val);
  info.GetReturnValue().Set(info.This());
}

void AmClientWrap::AsyncExecute(uv_work_t* handle) {
  AmClientWrap* client = static_cast<AmClientWrap*>(handle->data);

  printf("<JS> appid: %s\n", client->appid);
  client->native_ = static_cast<NativeBase*>(new AmClientBase(client->appid));
  client->native_->Enter(); // this function is a blocking function
}

void AmClientWrap::AsyncExecuteComplete(uv_work_t* handle, int status) {
  printf("AmClient Threading Completed\n");
  // TODO
}

void InitModule(Handle<Object> target) {
  AmClientWrap::Init(target);
}

NODE_MODULE(ams, InitModule);
