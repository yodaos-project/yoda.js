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
  uv_work_t worker;
  
  string event;
  int id = 0;
  int err = 0;
  bool initialized = false;

private:
  explicit TtsWrap();
  ~TtsWrap();

  void start();

  // init async processing functions
  static void DoInit(uv_work_t* handle);
  static void AfterInit(uv_work_t* handle, int status);

  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(Say);
  static NAN_METHOD(Stop);
  static NAN_METHOD(Reconnect);

};
