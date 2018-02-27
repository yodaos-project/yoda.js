#include <librokid-bt/librokid-bt.h>
#include "BluetoothWrap.h"

using namespace v8;
using namespace std;

BluetoothWrap::BluetoothWrap(const char* bt_name) {
  handle = rokidbt_create();
  rokidbt_init(handle, bt_name);
  rokidbt_set_event_listener(handle, OnEvent, this);
  rokidbt_set_discovery_cb(handle, AfterDiscovery, this);
}

BluetoothWrap::~BluetoothWrap() {
  rokidbt_destroy(handle);
}

BluetoothWrap::OnEvent(void* userdata, int what, int arg1, int arg2, void *data) {
  printf("on event %d %d %d %s\n", what, arg1, arg2, data);
}

BluetoothWrap::AfterDiscovery(void* userdata, 
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
  Nan::SetPrototypeMethod(tpl, "cancelDiscovery", CancelDiscovery);

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
  rokidbt_set_name(bluetooth->handle, *name);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::Discovery) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_discovery(bluetooth->handle);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::Cancel) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_discovery_cancel(bluetooth->handle);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::EnableA2dp) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_enable(bluetooth->handle);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::CloseA2dp) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_close(bluetooth->handle);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::DisableA2dp) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_disable(bluetooth->handle);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::EnableBle) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_ble_enable(bluetooth->handle);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::DisableBle) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_ble_disable(bluetooth->handle);
  info.GetReturnValue().Set(info.This());
}

void InitModule(Handle<Object> exports) {
  BluetoothWrap::Init(exports);
}

NODE_MODULE(bluetooth, InitModule);

