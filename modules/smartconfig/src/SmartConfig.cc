#include <stdio.h>
#include <uv.h>
#include <node.h>
#include <nan.h>
#include <cutils/properties.h>

using namespace v8;
using namespace std;

NAN_METHOD(Start) {
  start_smart_config();
}

NAN_METHOD(Stop) {
  stop_smart_config();
}

void InitModule(Handle<Object> target) {
  Nan::SetMethod(target, "start", Start);
  Nan::SetMethod(target, "stop", Stop);
}

NODE_MODULE(property, InitModule);