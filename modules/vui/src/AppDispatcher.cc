#include <uv.h>
#include <unistd.h>
#include "AppDispatcher.h"

using namespace std;
using namespace v8;

void AsyncCallback(uv_async_t* handle) {
  AppDispatcherWrap* dispatcher = static_cast<AppDispatcherWrap*>(handle->data);
  uv_mutex_lock(&dispatcher->async_locker);
  vector<VoiceEvent*> events = dispatcher->events;
  dispatcher->events.clear();
  uv_mutex_unlock(&dispatcher->async_locker);

  Nan::HandleScope scope;
  for (auto event : events) {
    size_t start = 3;
    size_t num = start + event->args.size();
    Local<Value> argv[num];
    argv[0] = Nan::New(const_cast<char*>(event->name)).ToLocalChecked();
    argv[1] = event->isCloud == 1 ? Nan::True() : Nan::False();
    argv[2] = event->isCut == 1 ? Nan::True() : Nan::False();

    for (auto &param : event->args) {
      argv[start] = Nan::New(param.c_str()).ToLocalChecked();
      start += 1;
    }
    delete event;
    dispatcher->callback->Call(num, argv);
  }
}

AppDispatcherWrap::AppDispatcherWrap() {
  uv_async_init(
      uv_default_loop()
    , &async
    , AsyncCallback
  );
  async.data = (void*)this;
  uv_mutex_init(&async_locker);
}
AppDispatcherWrap::~AppDispatcherWrap() {
  uv_mutex_destroy(&async_locker);
}

bool AppDispatcherWrap::onCreate(const std::string& ctx) {
  VoiceEvent* new_event = new VoiceEvent("create");
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);
  new_event->args.push_back(ctx);

  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onRestart(const std::string& ctx) {
  VoiceEvent* new_event = new VoiceEvent("restart");
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);
  new_event->args.push_back(ctx);

  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onRevival(const std::string& ctx) {
  VoiceEvent* new_event = new VoiceEvent("revival");
  // new_event->name = "revival";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);

  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onResume() {
  VoiceEvent* new_event = new VoiceEvent("resume");
  // new_event->name = "resume";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);
  
  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onPause() {
  VoiceEvent* new_event = new VoiceEvent("pause");
  // new_event->name = "pause";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);

  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onStop() {
  VoiceEvent* new_event = new VoiceEvent("stop");
  // new_event->name = "stop";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);

  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onDestroy() {
  VoiceEvent* new_event = new VoiceEvent("destroy");
  // new_event->name = "destroy";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);

  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onRapture() {
  VoiceEvent* new_event = new VoiceEvent("rapture");
  // new_event->name = "rapture";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);
  
  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onEvent(const std::string& json) {
  VoiceEvent* new_event = new VoiceEvent("event");
  // new_event->name = "event";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);
  new_event->args.push_back(json);
  
  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

bool AppDispatcherWrap::onVoiceCommand(const std::string& asr, const std::string& nlp, const std::string& action) {
  VoiceEvent* new_event = new VoiceEvent("voice_command");
  // new_event->name = "voice_command";
  new_event->isCloud = this->IsCloud ? 1 : 0;
  new_event->isCut = this->IsCut ? 1 : 0;
  new_event->args.push_back(this->AppId);
  new_event->args.push_back(asr);
  new_event->args.push_back(nlp);
  new_event->args.push_back(action);

  uv_mutex_lock(&async_locker);
  events.push_back(new_event);
  uv_mutex_unlock(&async_locker);
  uv_async_send(&async);
  return true;
}

NAN_MODULE_INIT(AppDispatcherWrap::Init) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("AppDispatcher").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  Nan::SetPrototypeMethod(tpl, "start", Start);
  Nan::SetPrototypeMethod(tpl, "redirect", Redirect);
  Nan::SetPrototypeMethod(tpl, "exitAll", ExitAll);
  Nan::SetPrototypeMethod(tpl, "exitCurrent", ExitCurrent);
  Nan::SetPrototypeMethod(tpl, "setPickup", SetPickup);
  Nan::SetPrototypeMethod(tpl, "getCurrent", GetCurrent);

  Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
  Nan::Set(target, Nan::New("AppDispatcher").ToLocalChecked(), func);
}

NAN_METHOD(AppDispatcherWrap::New) {
  AppDispatcherWrap* dispatcher = new AppDispatcherWrap();
  dispatcher->callback = new Nan::Callback(info[0].As<Function>());
  dispatcher->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AppDispatcherWrap::Start) {
  AppDispatcherWrap* dispatcher = Nan::ObjectWrap::Unwrap<AppDispatcherWrap>(info.This());
  dispatcher->worker.data = (void*)dispatcher;

  // TODO(Yazhong): return the value of `uv_queue_work`.
  uv_queue_work(
    uv_default_loop(), 
    &dispatcher->worker, 
    AsyncExecute, 
    AsyncExecuteComplete);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AppDispatcherWrap::Redirect) {
  String::Utf8Value appid(info[0]);
  AppDispatcherWrap* dispatcher = Nan::ObjectWrap::Unwrap<AppDispatcherWrap>(info.This());
  // FIXME(Yazhong): the 2nd param should be string
  dispatcher->StartActivity(*appid, "");
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AppDispatcherWrap::ExitAll) {
  AmsStop();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AppDispatcherWrap::ExitCurrent) {
  AppDispatcherWrap* dispatcher = Nan::ObjectWrap::Unwrap<AppDispatcherWrap>(info.This());
  dispatcher->Finish();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AppDispatcherWrap::SetPickup) {
  AppDispatcherWrap* dispatcher = Nan::ObjectWrap::Unwrap<AppDispatcherWrap>(info.This());
  bool val = info[0]->BooleanValue();
  dispatcher->OpenSiren(val);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(AppDispatcherWrap::GetCurrent) {
  AppDispatcherWrap* dispatcher = Nan::ObjectWrap::Unwrap<AppDispatcherWrap>(info.This());
  Local<Object> app = Nan::New<Object>();
  Nan::Set(app, Nan::New("appid").ToLocalChecked(), Nan::New(dispatcher->AppId.c_str()).ToLocalChecked());
  Nan::Set(app, Nan::New("isCut").ToLocalChecked(), Nan::New(dispatcher->IsCut));
  Nan::Set(app, Nan::New("isCloud").ToLocalChecked(), Nan::New(dispatcher->IsCloud));
  info.GetReturnValue().Set(app);
}

void AppDispatcherWrap::AsyncExecute(uv_work_t* handle) {
  AppDispatcherWrap* dispatcher = static_cast<AppDispatcherWrap*>(handle->data);
  AmsStart((AmsInterface*)dispatcher);
}

void AppDispatcherWrap::AsyncExecuteComplete(uv_work_t* handle, int status) {
  fprintf(stdout, "vui is running\n");
}

void InitModule(Handle<Object> target) {
  AppDispatcherWrap::Init(target);
}

NODE_MODULE(app_dispatcher, InitModule);
