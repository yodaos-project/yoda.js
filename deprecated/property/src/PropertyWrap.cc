#include <stdio.h>
#include <uv.h>
#include <node.h>
#include <nan.h>
#include <cutils/properties.h>

using namespace v8;
using namespace std;

NAN_METHOD(GetProperty) {
  v8::String::Utf8Value key(info[0].As<String>());
  char val[PROP_VALUE_MAX];
  property_get(strdup(*key), (char*)&val, "");
  info.GetReturnValue().Set(Nan::New(val).ToLocalChecked());
}

NAN_METHOD(SetProperty) {
  v8::String::Utf8Value key(info[0].As<String>());
  v8::String::Utf8Value val(info[1].As<String>());
  property_set(*key, *val);
}

void InitModule(Handle<Object> target) {
  Nan::SetMethod(target, "get", GetProperty);
  Nan::SetMethod(target, "set", SetProperty);
}

NODE_MODULE(property, InitModule);