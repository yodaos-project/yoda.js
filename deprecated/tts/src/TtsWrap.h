#pragma once

#include <stdio.h>
#include <uv.h>
#include <node.h>
#include <nan.h>

using namespace v8;
using namespace std;

class TtsWrap : public Nan::ObjectWrap {
public:
  static NAN_MODULE_INIT(Init);
  Nan::Callback* callback;
  
  string event;
  int id = 0;
  int err = 0;
  bool initialized = false;

private:
  explicit TtsWrap();
  ~TtsWrap();

  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(Say);
  static NAN_METHOD(Stop);

};
