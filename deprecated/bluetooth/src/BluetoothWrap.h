#pragma once

#include <stdio.h>
#include <node.h>
#include <nan.h>

using namespace v8;
using namespace std;

class BluetoothWrap : public Nan::ObjectWrap {
public:
  BluetoothWrap(const char* bt_name);
  ~BluetoothWrap();
  static NAN_MODULE_INIT(Init);

private:
  RKBluetooth* bt_handle_;

  static void OnEvent(void* userdata, int what, int arg1, int arg2, void* data);
  static void AfterEvent(uv_async_t* async);
  static void AfterCallback(uv_handle_t* handle);
  static void OnDiscovery(void* userdata, const char* bt_name, const char bt_addr[6], int is_completed);
  static void AfterDiscovery(uv_async_t* async);

  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(SetName);
  static NAN_METHOD(SetVisibility);
  static NAN_METHOD(SetBleVisibility);
  static NAN_METHOD(Discovery);
  static NAN_METHOD(Cancel);
  static NAN_METHOD(GetDevices);
  static NAN_METHOD(Destroy);

  // a2dp
  static NAN_METHOD(EnableA2dp);
  static NAN_METHOD(CloseA2dp);
  static NAN_METHOD(DisableA2dp);

  // a2dp sink
  static NAN_METHOD(EnableA2dpSink);
  static NAN_METHOD(CloseA2dpSink);
  static NAN_METHOD(DisableA2dpSink);
  static NAN_METHOD(A2dpSinkSendPlay);
  static NAN_METHOD(A2dpSinkSendStop);
  static NAN_METHOD(A2dpSinkSendPause);
  static NAN_METHOD(A2dpSinkSendForward);
  static NAN_METHOD(A2dpSinkSendBackward);

  // ble methods
  static NAN_METHOD(EnableBle);
  static NAN_METHOD(DisableBle);
};
