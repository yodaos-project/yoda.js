#include "LumenWrap.h"

using namespace v8;
using namespace std;

LumenWrap::LumenWrap() {
  light = new LumenLight();
}

LumenWrap::~LumenWrap() {
  // TODO
}

NAN_MODULE_INIT(LumenWrap::Init) {
  Local<FunctionTemplate> tmpl = Nan::New<FunctionTemplate>(New);
  tmpl->SetClassName(Nan::New("LumenWrap").ToLocalChecked());
  tmpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetAccessor(tmpl->InstanceTemplate(), 
    Nan::New("platform").ToLocalChecked(), PlatformGetter);
  Nan::SetAccessor(tmpl->InstanceTemplate(), 
    Nan::New("frameSize").ToLocalChecked(), FrameSizeGetter);
  Nan::SetAccessor(tmpl->InstanceTemplate(), 
    Nan::New("ledCount").ToLocalChecked(), LedCountGetter);
  Nan::SetAccessor(tmpl->InstanceTemplate(), 
    Nan::New("pixelFormat").ToLocalChecked(), PixelFormatGetter);
  Nan::SetAccessor(tmpl->InstanceTemplate(), 
    Nan::New("fps").ToLocalChecked(), FpsGetter);

  Nan::SetPrototypeMethod(tmpl, "start", Start);
  Nan::SetPrototypeMethod(tmpl, "pause", Pause);
  Nan::SetPrototypeMethod(tmpl, "stop", Stop);
  Nan::SetPrototypeMethod(tmpl, "draw", Draw);

  Local<Function> func = Nan::GetFunction(tmpl).ToLocalChecked();
  Nan::Set(target, Nan::New("LumenWrap").ToLocalChecked(), func);
}

NAN_METHOD(LumenWrap::New) {
  LumenWrap* lumen = new LumenWrap();
  lumen->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_PROPERTY_GETTER(LumenWrap::PlatformGetter) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  Local<Number> platformId = Nan::New(lumen->light->m_platform);
  info.GetReturnValue().Set(platformId);
}

NAN_PROPERTY_GETTER(LumenWrap::FrameSizeGetter) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  Local<Number> platformId = Nan::New(lumen->light->m_frameSize);
  info.GetReturnValue().Set(platformId);
}

NAN_PROPERTY_GETTER(LumenWrap::LedCountGetter) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  Local<Number> platformId = Nan::New(lumen->light->m_ledCount);
  info.GetReturnValue().Set(platformId);
}

NAN_PROPERTY_GETTER(LumenWrap::PixelFormatGetter) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  Local<Number> platformId = Nan::New(lumen->light->m_pixelFormat);
  info.GetReturnValue().Set(platformId);
}

NAN_PROPERTY_GETTER(LumenWrap::FpsGetter) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  Local<Number> platformId = Nan::New(lumen->light->m_fps);
  info.GetReturnValue().Set(platformId);
}

NAN_METHOD(LumenWrap::Start) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  if (lumen->enabled) {
    return Nan::ThrowError("The light has been enabled.");
  }
  lumen->light->lumen_set_enable(true);
  lumen->enabled = true;
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(LumenWrap::Pause) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  if (!lumen->enabled) {
    return Nan::ThrowError("The light has not been enabled.");
  }
  lumen->light->lumen_set_enable(false);
  lumen->enabled = false;
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(LumenWrap::Stop) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  lumen->light = nullptr;
  lumen->enabled = false;
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(LumenWrap::Draw) {
  LumenWrap* lumen = Nan::ObjectWrap::Unwrap<LumenWrap>(info.This());
  if (!lumen->enabled) {
    return Nan::ThrowError("The light is not enabled");
  }
  int count = lumen->light->m_ledCount;
  int pixels = lumen->light->m_pixelFormat;

  unsigned char data[count * pixels]= { 0 };
  Local<Object> dataObj = info[0]->ToObject();
  Local<Array> keys = dataObj->GetPropertyNames();
  for (uint32_t i = 0; i < keys->Length(); i++) {
    int num = Nan::To<int32_t>(Nan::Get(keys, i).ToLocalChecked()).FromJust();
    Local<Object> colors = Nan::Get(dataObj, num).ToLocalChecked()->ToObject();
    for (int j = 0; j < pixels; j++) {
      int color = Nan::Get(colors, j).ToLocalChecked()->NumberValue();
      data[num * pixels + j] = color;
    }
  }
  lumen->light->lumen_set_enable(true);
  lumen->light->lumen_draw(data, sizeof(data));
  lumen->light->lumen_set_enable(false);
  info.GetReturnValue().Set(info.This());
}

void InitModule(Handle<Object> target) {
  LumenWrap::Init(target);
}

NODE_MODULE(lumen, InitModule);

