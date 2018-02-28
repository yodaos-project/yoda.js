#include <librokid-bt/librokid-bt.h>
#include "BluetoothWrap.h"

using namespace v8;
using namespace std;

typedef struct bt_event_s {
  int what;
  int arg1;
  int arg2;
  void* data;
  BluetoothWrap* bt;
} bt_event_t;

BluetoothWrap::BluetoothWrap(const char* bt_name) {
  bt_handle_ = rokidbt_create();
  rokidbt_init(bt_handle_, bt_name);
  rokidbt_set_event_listener(bt_handle_, BluetoothWrap::OnEvent, this);
  rokidbt_set_discovery_cb(bt_handle_, BluetoothWrap::AfterDiscovery, this);
}

BluetoothWrap::~BluetoothWrap() {
  rokidbt_destroy(bt_handle_);
}

void BluetoothWrap::OnEvent(void* userdata, int what, int arg1, int arg2, void* data) {
  BluetoothWrap* bluetooth = static_cast<BluetoothWrap*>(userdata);

  bt_event_t* event = new bt_event_t;
  event->what = what;
  event->arg1 = arg1;
  event->arg2 = arg2;
  event->data = data;
  event->bt = bluetooth;

  uv_async_t* async = new uv_async_t;
  async->data = (void*)event;

  uv_async_init(uv_default_loop(), async, BluetoothWrap::AfterEvent);
  uv_async_send(async);
}

void BluetoothWrap::AfterEvent(uv_async_t* async) {
  bt_event_t* event = (bt_event_t*)async->data;
  BluetoothWrap* bluetooth = static_cast<BluetoothWrap*>(event->bt);

  Nan::HandleScope scope;
  Nan::MaybeLocal<Value> onevent = Nan::Get(
    bluetooth->handle(), Nan::New("onevent").ToLocalChecked());
  Nan::Callback callback(onevent.ToLocalChecked().As<Function>());

  Local<Value> argv[4];
  argv[0] = Nan::New<Number>(event->what);
  argv[1] = Nan::New<Number>(event->arg1);
  argv[2] = Nan::New<Number>(event->arg2);

  if (event->data != NULL) {
    char msg[event->arg2 + 1];
    memset(msg, 0, event->arg2 + 1);
    memcpy(msg, event->data, event->arg2);
    argv[3] = Nan::New<String>(msg).ToLocalChecked();
  } else {
    argv[3] = Nan::Null();
  }
  callback.Call(4, argv);

  free(event);
  uv_close((uv_handle_t*)async, BluetoothWrap::AfterCallback);
}

void BluetoothWrap::AfterCallback(uv_handle_t* handle) {
  if (handle)
    delete handle;
}

void BluetoothWrap::AfterDiscovery(void* userdata, 
                                   const char* bt_name, 
                                   const char bt_addr[6], 
                                   int is_completed) {
  printf("discovery done\n");
}

NAN_MODULE_INIT(BluetoothWrap::Init) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("BluetoothWrap").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tpl, "setName", SetName);
  Nan::SetPrototypeMethod(tpl, "discovery", Discovery);
  Nan::SetPrototypeMethod(tpl, "cancel", Cancel);

  // a2dp
  Nan::SetPrototypeMethod(tpl, "enableA2dp", EnableA2dp);
  Nan::SetPrototypeMethod(tpl, "closeA2dp", CloseA2dp);
  Nan::SetPrototypeMethod(tpl, "disableA2dp", DisableA2dp);

  // ble
  Nan::SetPrototypeMethod(tpl, "enableBle", EnableBle);
  Nan::SetPrototypeMethod(tpl, "disableBle", DisableBle);

  Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
  Nan::Set(target, Nan::New("BluetoothWrap").ToLocalChecked(), func);
}

NAN_METHOD(BluetoothWrap::New) {
  String::Utf8Value name(info[0]);
  BluetoothWrap* bluetooth = new BluetoothWrap(*name);
  bluetooth->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::SetName) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  String::Utf8Value name(info[0]);
  rokidbt_set_name(bluetooth->bt_handle_, *name);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::Discovery) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_discovery(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::Cancel) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_discovery_cancel(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::GetDevices) {
  
}

NAN_METHOD(BluetoothWrap::EnableA2dp) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_enable(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::CloseA2dp) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_close(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::DisableA2dp) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_disable(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::EnableBle) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_ble_enable(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::DisableBle) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_ble_disable(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

void InitModule(Handle<Object> exports) {
  BluetoothWrap::Init(exports);
}

NODE_MODULE(bluetooth, InitModule);

