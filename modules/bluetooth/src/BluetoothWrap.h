#pragma once

#include <stdio.h>
#include <node.h>
#include <nan.h>
#include "BluetoothWrap.h"

using namespace v8;
using namespace std;

class BluetoothWrap : public Nan::ObjectWrap {
public:
  BluetoothWrap();
  ~BluetoothWrap();
  static NAN_MODULE_INIT(Init);

private:
  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(Open);
  static NAN_METHOD(Close);

  // a2dp
  static NAN_METHOD(EnableA2DP);
  static NAN_METHOD(EnableA2DPSink);
  static NAN_METHOD(EnableA2DPLink);
  static NAN_METHOD(SendCommand);

  // ble methods
  static NAN_METHOD(EnableBLE);
  static NAN_METHOD(DisableBLE);
  static NAN_METHOD(BLE_SendResp);
  static NAN_METHOD(BLE_GetResp);

  // a2dp
  // TODO
};
