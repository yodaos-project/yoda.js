#pragma once

#include <stdio.h>
#include <node.h>
#include <uv.h>
#include <nan.h>
#include <ams/AmsInterface.h>

using namespace v8;
using namespace std;

class VoiceEvent {
 public:
  VoiceEvent(const char* name_) : name(name_) {};
  const char* name;
  int isCloud;
  int isCut;
  vector<string> args;
};

class AppDispatcherWrap : public AmsInterface
                        , public Nan::ObjectWrap {
 public:
  AppDispatcherWrap();
  ~AppDispatcherWrap();
  Nan::Callback* callback;
  vector<VoiceEvent*> events;
  uv_async_t async;
  uv_mutex_t async_locker;

 public:
  bool onCreate(const std::string&);
  bool onRestart(const std::string&);
  bool onRevival(const std::string&);
  bool onResume();
  bool onPause();
  bool onStop();
  bool onDestroy();
  bool onRapture();
  bool onEvent(const std::string&);
  bool onVoiceCommand(const std::string&, const std::string&, const std::string&);

 public:
  static NAN_MODULE_INIT(Init);
  static NAN_METHOD(New);
  static NAN_METHOD(Start);
  static NAN_METHOD(Redirect);
  static NAN_METHOD(ExitAll);
  static NAN_METHOD(ExitCurrent);
  static NAN_METHOD(SetPickup);
  static NAN_METHOD(GetCurrent);

  // async execute
  static void AsyncExecute(uv_work_t* handle);
  static void AsyncExecuteComplete(uv_work_t* handle, int status);
  uv_work_t worker;
};
