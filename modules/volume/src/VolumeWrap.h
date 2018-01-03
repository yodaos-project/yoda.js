#pragma once

#include <stdio.h>
#include <uv.h>
#include <node.h>
#include <nan.h>

using namespace v8;
using namespace std;

class VolumeWrap : public Nan::ObjectWrap {
public:
  static NAN_MODULE_INIT(Init);

private:
  explicit VolumeWrap();
  ~VolumeWrap();

  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(Get);
  static NAN_METHOD(Set);
  static NAN_METHOD(GetMute);
  static NAN_METHOD(SetMute);
  static NAN_METHOD(GetByStream);
  static NAN_METHOD(SetByStream);

};
