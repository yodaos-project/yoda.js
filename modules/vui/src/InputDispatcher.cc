#include <stdio.h>
#include <stdlib.h>
#include <InputDispatcher.h>

using namespace v8;
using namespace android;

class InputServer : public virtual InputServerInterface {
 public:
  InputServer(InputDispatcherWrap* wrap_) : wrap(wrap_) {};
  void dispatchKey(input_keyevent_t* event) {
    if (!event)
      return;
    wrap->event = event;
    uv_async_send(&wrap->async);
  }
  void notifySwitch(nsecs_t when, uint32_t switchValues, uint32_t switchMask) {
    // TODO
  }
  void dispatchMotion(struct inputmotion_event* event) {
    // TODO
  }
  InputDispatcherWrap* wrap;
};

InputDispatcherWrap::InputDispatcherWrap() {
  uv_async_init(
      uv_default_loop()
    , &async
    , AsyncCallback
  );
  async.data = (void*)this;
  uv_mutex_init(&async_locker);
}

InputDispatcherWrap::~InputDispatcherWrap() {
  uv_mutex_destroy(&async_locker);
}

NAN_MODULE_INIT(InputDispatcherWrap::Init) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("InputDispatcherWrap").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  Nan::SetPrototypeMethod(tpl, "listen", Listen);

  Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
  Nan::Set(target, Nan::New("InputDispatcher").ToLocalChecked(), func);
}

NAN_METHOD(InputDispatcherWrap::New) {
  InputDispatcherWrap* dispatcher = new InputDispatcherWrap();
  dispatcher->callback = new Nan::Callback(info[0].As<Function>());
  dispatcher->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(InputDispatcherWrap::Listen) {
  InputDispatcherWrap* dispatcher = Nan::ObjectWrap::Unwrap<InputDispatcherWrap>(info.This());
  dispatcher->worker.data = (void*)dispatcher;

  // TODO(Yazhong): return the value of `uv_queue_work`.
  uv_queue_work(
    uv_default_loop(), 
    &dispatcher->worker, 
    DoExecute, 
    AfterExecute);
  info.GetReturnValue().Set(info.This());
}

void InputDispatcherWrap::DoExecute(uv_work_t* handle) {
  InputDispatcherWrap* wrap = static_cast<InputDispatcherWrap*>(handle->data);
  InputServer* server = new InputServer(wrap);
  NativeInputManager* mgr = new NativeInputManager(server);
  mgr->setInputDispatchMode(true, false);
  mgr->getInputManager()->start();
}

void InputDispatcherWrap::AfterExecute(uv_work_t* handle, int status) {
  fprintf(stdout, "inputflinger is done\n");
}

void InputDispatcherWrap::AsyncCallback(uv_async_t* handle) {
  InputDispatcherWrap* wrap = static_cast<InputDispatcherWrap*>(handle->data);
  uv_mutex_lock(&wrap->async_locker);
  input_keyevent_t* event = wrap->event;
  uv_mutex_unlock(&wrap->async_locker);

  Nan::HandleScope scope;
  Local<Value> argv[1];
  Local<Object> eventObj = Nan::New<Object>();
  const char* event_timestamp = std::to_string(event->eventTime).c_str();
  const char* down_timestamp = std::to_string(event->downTime).c_str();

  Nan::Set(eventObj, Nan::New("eventTime").ToLocalChecked(), Nan::New(event_timestamp).ToLocalChecked());
  Nan::Set(eventObj, Nan::New("deviceId").ToLocalChecked(), Nan::New(event->deviceId));
  Nan::Set(eventObj, Nan::New("source").ToLocalChecked(), Nan::New(event->source));
  Nan::Set(eventObj, Nan::New("policyFlags").ToLocalChecked(), Nan::New(event->policyFlags));
  Nan::Set(eventObj, Nan::New("action").ToLocalChecked(), Nan::New(event->action));
  Nan::Set(eventObj, Nan::New("flags").ToLocalChecked(), Nan::New(event->flags));
  Nan::Set(eventObj, Nan::New("keyCode").ToLocalChecked(), Nan::New(event->keyCode));
  Nan::Set(eventObj, Nan::New("scanCode").ToLocalChecked(), Nan::New(event->scanCode));
  Nan::Set(eventObj, Nan::New("metaState").ToLocalChecked(), Nan::New(event->metaState));
  Nan::Set(eventObj, Nan::New("downTime").ToLocalChecked(), Nan::New(down_timestamp).ToLocalChecked());
  argv[0] = eventObj;
  wrap->callback->Call(1, argv);
}

void InitModule(Handle<Object> target) {
  InputDispatcherWrap::Init(target);
}

NODE_MODULE(input_dispatcher, InitModule);
