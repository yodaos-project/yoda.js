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

typedef struct bt_device_s {
  char* name;
  uint8_t addr[6];
  bool completed;
  BluetoothWrap* bt;
} bt_device_t;

BluetoothWrap::BluetoothWrap(const char* bt_name) {
  bt_handle_ = rokidbt_create();
  rokidbt_init(bt_handle_, bt_name);
  rokidbt_set_event_listener(bt_handle_, BluetoothWrap::OnEvent, this);
  rokidbt_set_discovery_cb(bt_handle_, BluetoothWrap::OnDiscovery, this);
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

void BluetoothWrap::OnDiscovery(void* userdata, 
                                const char* bt_name, 
                                const char bt_addr[6], 
                                int is_completed) {
  BluetoothWrap* bluetooth = static_cast<BluetoothWrap*>(userdata);

  bt_device_t* device = new bt_device_t;
  if (bt_name != NULL) {
    device->name = strdup(bt_name);
  }
  if (bt_addr != NULL) {
    for (int i = 0; i < 6; i++) {
      device->addr[i] = (uint8_t)bt_addr[i];
    }
  }
  device->completed = is_completed;
  device->bt = bluetooth;

  uv_async_t* async = new uv_async_t;
  async->data = (void*)device;

  uv_async_init(uv_default_loop(), async, BluetoothWrap::AfterDiscovery);
  uv_async_send(async);
  printf("discovery asyn sent\n");
}

void BluetoothWrap::AfterDiscovery(uv_async_t* async) {
  bt_device_t* device = (bt_device_t*)async->data;
  BluetoothWrap* bluetooth = static_cast<BluetoothWrap*>(device->bt);

  Nan::HandleScope scope;
  Nan::MaybeLocal<Value> ondiscovery = Nan::Get(
    bluetooth->handle(), Nan::New("ondiscovery").ToLocalChecked());
  Nan::Callback callback(ondiscovery.ToLocalChecked().As<Function>());

  Local<Value> argv[2];
  if (device->name != NULL) {
    argv[0] = Nan::New<String>(device->name).ToLocalChecked();
  } else {
    argv[0] = Nan::Null();
  }
  argv[1] = Nan::New<Boolean>(device->completed);
  // argv[2] = Nan::New<Number>(event->arg2);

  callback.Call(2, argv);

  free(device);
  uv_close((uv_handle_t*)async, NULL);
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

NAN_METHOD(BluetoothWrap::SetVisibility) {
  int visible = info[0]->NumberValue();
  rokidbt_set_visibility(visible);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::SetBleVisibility) {
  int visible = info[0]->NumberValue();
  rokidbt_set_ble_visibility(visible);
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

NAN_METHOD(BluetoothWrap::Destroy) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_destroy(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::GetDevices) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  int count = rokidbt_get_disc_devices_count(bluetooth->bt_handle_);
  BTDevice devices[count];
  rokidbt_get_disc_devices(bluetooth->bt_handle_, devices, count);

  Local<Array> jdevices = Nan::New<Array>(count);
  for (int i = 0; i < count; i++) {
    // Local<Object> jdev = Nan::New();
    // BluetoothDevice* device = new BluetoothDevice(devices[i]);
    // Nan::Set(jdevices, i, jdev);
  }
  info.GetReturnValue().Set(jdevices);
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

NAN_METHOD(BluetoothWrap::EnableA2dpSink) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_enable(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::CloseA2dpSink) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_close(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::DisableA2dpSink) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_disable(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::A2dpSinkSendStop) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_send_stop(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::A2dpSinkSendPlay) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_send_play(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::A2dpSinkSendPause) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_send_pause(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::A2dpSinkSendForward) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_send_forward(bluetooth->bt_handle_);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::A2dpSinkSendBackward) {
  BluetoothWrap* bluetooth = Nan::ObjectWrap::Unwrap<BluetoothWrap>(info.This());
  rokidbt_a2dp_sink_send_backward(bluetooth->bt_handle_);
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

NAN_MODULE_INIT(BluetoothWrap::Init) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("BluetoothWrap").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tpl, "setName", SetName);
  Nan::SetPrototypeMethod(tpl, "setVisibility", SetVisibility);
  Nan::SetPrototypeMethod(tpl, "discovery", Discovery);
  Nan::SetPrototypeMethod(tpl, "cancel", Cancel);
  Nan::SetPrototypeMethod(tpl, "destroy", Destroy);

  // a2dp
  Nan::SetPrototypeMethod(tpl, "enableA2dp", EnableA2dp);
  Nan::SetPrototypeMethod(tpl, "closeA2dp", CloseA2dp);
  Nan::SetPrototypeMethod(tpl, "disableA2dp", DisableA2dp);

  // a2dp sink
  Nan::SetPrototypeMethod(tpl, "enableA2dpSink", EnableA2dpSink);
  Nan::SetPrototypeMethod(tpl, "closeA2dpSink", CloseA2dpSink);
  Nan::SetPrototypeMethod(tpl, "disableA2dpSink", DisableA2dpSink);
  Nan::SetPrototypeMethod(tpl, "a2dpSinkSendPlay", A2dpSinkSendPlay);
  Nan::SetPrototypeMethod(tpl, "a2dpSinkSendStop", A2dpSinkSendStop);
  Nan::SetPrototypeMethod(tpl, "a2dpSinkSendPause", A2dpSinkSendPause);
  Nan::SetPrototypeMethod(tpl, "a2dpSinkSendForward", A2dpSinkSendForward);
  Nan::SetPrototypeMethod(tpl, "a2dpSinkSendBackward", A2dpSinkSendBackward);

  // ble
  Nan::SetPrototypeMethod(tpl, "enableBle", EnableBle);
  Nan::SetPrototypeMethod(tpl, "disableBle", DisableBle);

  Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
  Nan::Set(target, Nan::New("BluetoothWrap").ToLocalChecked(), func);
}

void InitModule(Handle<Object> exports) {
  BluetoothWrap::Init(exports);
}

NODE_MODULE(bluetooth, InitModule);

