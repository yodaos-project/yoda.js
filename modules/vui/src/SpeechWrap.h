#pragma once

#include <stdio.h>
#include <node.h>
#include <uv.h>
#include <nan.h>

#include <openvoice_process/IVoiceCallback.h>
#include <openvoice_process/IVoiceService.h>
#include <binder/Parcel.h>
#include <binder/IServiceManager.h>
#include <binder/IPCThreadState.h>
#include <binder/ProcessState.h>

using namespace v8;
using namespace std;

/**
 * @class VoiceCallback
 */
class VoiceCallback;

/**
 * @class SpeechWrap
 * @extends Nan::ObjectWrap
 */
class SpeechWrap : public Nan::ObjectWrap {
 public:
  SpeechWrap();
  ~SpeechWrap();
  sp<IVoiceService> _handle;
  VoiceCallback* _voiceCb;

 public:
  static void OnVoiceEvent(uv_async_t*);
  static void OnVoiceCommand(uv_async_t*);
  static void OnIntermediateResult(uv_async_t*);
  static void OnError(uv_async_t*);
  static void AfterCloseAsync(uv_handle_t* handle) {
    delete handle;
  }

 public:
  static NAN_MODULE_INIT(Init);
  static NAN_METHOD(New);
  static NAN_METHOD(Start);
  static NAN_METHOD(Pause);
  static NAN_METHOD(Resume);
  static NAN_METHOD(UpdateStack);
  static NAN_METHOD(UpdateConfig);
  static NAN_METHOD(SetSirenState);
  static NAN_METHOD(RequestNlpByText);
  // static NAN_METHOD(InsertVoiceTrigger);
  // static NAN_METHOD(DeleteVoiceTrigger);
};
