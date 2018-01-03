#include "src/VolumeWrap.h"
#include <vol_ctrl/volumecontrol.h>

using namespace v8;
using namespace std;

VolumeWrap::VolumeWrap() {
  // TODO
}

VolumeWrap::~VolumeWrap() {
  // TODO
}

NAN_MODULE_INIT(VolumeWrap::Init) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("VolumeWrap").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tpl, "get", Get);
  Nan::SetPrototypeMethod(tpl, "set", Set);
  Nan::SetPrototypeMethod(tpl, "getMute", GetMute);
  Nan::SetPrototypeMethod(tpl, "setMute", SetMute);
  Nan::SetPrototypeMethod(tpl, "getByStream", GetByStream);
  Nan::SetPrototypeMethod(tpl, "setByStream", SetByStream);

  Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
  Nan::Set(target, Nan::New("VolumeWrap").ToLocalChecked(), func);
}

NAN_METHOD(VolumeWrap::New) {
  VolumeWrap* volume = new VolumeWrap();
  volume->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(VolumeWrap::Get) {
  int vol = rk_get_volume();
  info.GetReturnValue().Set(Nan::New(vol));
}

NAN_METHOD(VolumeWrap::Set) {
  int vol = info[0]->NumberValue();
  int r = rk_set_volume(vol);
  info.GetReturnValue().Set(Nan::New(r));
}


NAN_METHOD(VolumeWrap::GetMute) {
  info.GetReturnValue().Set(Nan::New<Boolean>(rk_is_mute()));
}

NAN_METHOD(VolumeWrap::SetMute) {
  int is_mute = info[0]->NumberValue();
  if (is_mute) {
    rk_set_mute(true);
  } else {
    rk_set_mute(false);
  }
}

NAN_METHOD(VolumeWrap::GetByStream) {
  int vol = 0;
  v8::String::Utf8Value streamName(info[0]);
  if (strcmp(*streamName, "media") == 0) {
    vol = rk_get_stream_volume(STREAM_AUDIO);
  } else if (strcmp(*streamName, "tts") == 0) {
    vol = rk_get_stream_volume(STREAM_TTS);
  } else if (strcmp(*streamName, "alarm") == 0) {
    vol = rk_get_stream_volume(STREAM_ALARM);
  } else {
    return Nan::ThrowError("unsupported volume type");
  }
  info.GetReturnValue().Set(Nan::New(vol));
}

NAN_METHOD(VolumeWrap::SetByStream) {
  v8::String::Utf8Value streamName(info[0]);
  int vol = info[1]->NumberValue();
  if (strcmp(*streamName, "media") == 0) {
    vol = rk_set_stream_volume(STREAM_AUDIO, vol);
  } else if (strcmp(*streamName, "tts") == 0) {
    vol = rk_set_stream_volume(STREAM_TTS, vol);
  } else if (strcmp(*streamName, "alarm") == 0) {
    vol = rk_set_stream_volume(STREAM_ALARM, vol);
  } else {
    return Nan::ThrowError("unsupported volume type");
  }
}

void InitModule(Handle<Object> target) {
  VolumeWrap::Init(target);
}

NODE_MODULE(tts, InitModule);
