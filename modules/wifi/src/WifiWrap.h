#pragma once

#include <stdio.h>
#include <uv.h>
#include <node.h>
#include <nan.h>
#include <wpa_command.h>

using namespace v8;
using namespace std;

class WifiWrap : public Nan::ObjectWrap {
public:
  static NAN_MODULE_INIT(Init);

private:
  explicit WifiWrap();
  ~WifiWrap();
  int status();

  struct wifi_network network_;
  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(Save);
  static NAN_METHOD(Connect);
  static NAN_METHOD(Disconnect);
  static NAN_METHOD(GetStatus);
  static NAN_METHOD(ResInit);
};
