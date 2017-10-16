#pragma once

#include <stdio.h>
#include <node.h>
#include <nan.h>
#include "LumenLight.h"

using namespace v8;
using namespace std;

class LumenWrap : public Nan::ObjectWrap {
public:
	LumenWrap();
	~LumenWrap();
  static NAN_MODULE_INIT(Init);
  LumenLight* light;
  bool enabled = false;

private:
  // properties
  static NAN_PROPERTY_GETTER(PlatformGetter);
  static NAN_PROPERTY_GETTER(FrameSizeGetter);
  static NAN_PROPERTY_GETTER(LedCountGetter);
  static NAN_PROPERTY_GETTER(PixelFormatGetter);
  static NAN_PROPERTY_GETTER(FpsGetter);

  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(Start);
  static NAN_METHOD(Pause);
  static NAN_METHOD(Stop);
  static NAN_METHOD(Draw);
};
