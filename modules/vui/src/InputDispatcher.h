#pragma once

#include <node.h>
#include <uv.h>
#include <nan.h>
#include <inputflinger/rkInputCommon.h>
#include <inputflinger/rkinputmanager.h>

using namespace v8;
using namespace android;

typedef struct inputkey_event input_keyevent_t;

class InputDispatcherWrap : public Nan::ObjectWrap {
 public:
  InputDispatcherWrap();
  ~InputDispatcherWrap();
  Nan::Callback* callback;
  uv_async_t async;
  uv_mutex_t async_locker;
  input_keyevent_t event;

 public:
  static NAN_MODULE_INIT(Init);
  static NAN_METHOD(New);
  static NAN_METHOD(Listen);

  // async execute
  static void DoExecute(uv_work_t* handle);
  static void AfterExecute(uv_work_t* handle, int status);
  static void AsyncCallback(uv_async_t* handle);
  uv_work_t worker;
};