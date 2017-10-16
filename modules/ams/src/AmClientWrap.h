#pragma once

#include <stdio.h>
#include <node.h>
#include <nan.h>
#include <ams/rknative.h>

using namespace v8;
using namespace std;

class AmClientWrap : public Nan::ObjectWrap {
public:
  AmClientWrap();
  ~AmClientWrap();

  NativeBase* native_;
  const char* appid;
  const char* event;
  vector<char*> args;

  Nan::Callback* callback;
  static NAN_MODULE_INIT(Init);

private:
  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(Start);
  static NAN_METHOD(Stop);
  static NAN_METHOD(Finish);
  static NAN_METHOD(OpenSiren);

  // async execute
  static void AsyncExecute(uv_work_t* handle);
  static void AsyncExecuteComplete(uv_work_t* handle, int status);
  uv_work_t worker;
};
