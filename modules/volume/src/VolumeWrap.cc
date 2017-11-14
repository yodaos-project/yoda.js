#include "src/VolumeWrap.h"
#include <vol_ctrl/volumecontrol.h>

using namespace v8;
using namespace std;

VolumeWrap::VolumeWrap() {
}

VolumeWrap::~VolumeWrap() {
}

NAN_MODULE_INIT(VolumeWrap::Init) {
  Local<FunctionTemplate> tmpl = Nan::New<FunctionTemplate>(New);
  tmpl->SetClassName(Nan::New("VolumeWrap").ToLocalChecked());
  tmpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tmpl, "set", Set);
  Nan::SetPrototypeMethod(tmpl, "get", Get);
  Nan::SetPrototypeMethod(tmpl, "setAll", SetAll);
  Nan::SetPrototypeMethod(tmpl, "getAll", GetAll);

  Local<Function> func = Nan::GetFunction(tmpl).ToLocalChecked();
  Nan::Set(target, Nan::New("VolumeWrap").ToLocalChecked(), func);
}

NAN_METHOD(VolumeWrap::New) {
  VolumeWrap* volume = new VolumeWrap();
  volume->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(VolumeWrap::Set) {
  v8::String::Utf8Value name(info[0].As<String>());
  int vol = info[1]->NumberValue();
  int r = set_app_volume(*name, vol);
  info.GetReturnValue().Set(Nan::New(r));
}

NAN_METHOD(VolumeWrap::Get) {
  v8::String::Utf8Value name(info[0].As<String>());
  int vol = get_app_volume(*name);
  info.GetReturnValue().Set(Nan::New(vol));
}

NAN_METHOD(VolumeWrap::SetAll) {
  int vol = info[0]->NumberValue();
  int r = set_all_volume(vol);
  info.GetReturnValue().Set(Nan::New(r));
}

NAN_METHOD(VolumeWrap::GetAll) {
  int vol = get_all_volume();
  info.GetReturnValue().Set(Nan::New(vol));
}

void InitModule(Handle<Object> target) {
  VolumeWrap::Init(target);
}

NODE_MODULE(tts, InitModule);
