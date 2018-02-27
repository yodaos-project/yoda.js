#pragma once

#include <stdio.h>
#include <node.h>
#include <nan.h>

using namespace v8;
using namespace std;

class BluetoothWrap : public Nan::ObjectWrap {
public:
  BluetoothWrap();
  ~BluetoothWrap();
  static NAN_MODULE_INIT(Init);

private:
  RKBluetooth* handle;

  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(SetName);
  static NAN_METHOD(Discovery);
  static NAN_METHOD(Cancel);

  // a2dp
  static NAN_METHOD(EnableA2dp);
  static NAN_METHOD(CloseA2dp);
  static NAN_METHOD(DisableA2dp);

  // ble methods
  static NAN_METHOD(EnableBle);
  static NAN_METHOD(DisableBle);
};
