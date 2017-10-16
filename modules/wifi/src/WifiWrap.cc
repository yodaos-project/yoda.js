#include "src/WifiWrap.h"

using namespace v8;
using namespace std;

WifiWrap::WifiWrap() {
  memset(network_.ssid, 0, 32);
  memset(network_.psk, 0, 64);
}

WifiWrap::~WifiWrap() {
  // TODO
}

int WifiWrap::status() {
  int v;
  wifi_get_status(&v);
  return v;
}

NAN_MODULE_INIT(WifiWrap::Init) {
  Local<FunctionTemplate> tmpl = Nan::New<FunctionTemplate>(New);
  tmpl->SetClassName(Nan::New("WifiWrap").ToLocalChecked());
  tmpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tmpl, "connect", Connect);
  Nan::SetPrototypeMethod(tmpl, "getStatus", GetStatus);

  Local<Function> func = Nan::GetFunction(tmpl).ToLocalChecked();
  Nan::Set(target, Nan::New("WifiWrap").ToLocalChecked(), func);
}

NAN_METHOD(WifiWrap::New) {
  WifiWrap* handle = new WifiWrap();
  handle->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(WifiWrap::Connect) {
  WifiWrap* handle = Nan::ObjectWrap::Unwrap<WifiWrap>(info.This());
  v8::String::Utf8Value ssid(info[0].As<String>());
  v8::String::Utf8Value psk(info[1].As<String>());
  int method = info[2]->NumberValue();

  char* ssid_str = strdup(*ssid);
  char* psk_str = strdup(*psk);
  printf("ssid: %s, psk: %s\n", ssid_str, psk_str);

  memcpy(handle->network_.ssid, ssid_str, ssid.length());
  memcpy(handle->network_.psk, psk_str, psk.length());
  handle->network_.key_mgmt = method;
  wifi_join_network(&handle->network_);
  dhcp_reset();

  int r = handle->status();
  int connected = 0;
  if (WIFI_CONNECTED == r) {
    wifi_save_network();
    connected = 1;
  }
  info.GetReturnValue().Set(Nan::New<Boolean>(connected));
}

NAN_METHOD(WifiWrap::GetStatus) {
  WifiWrap* handle = Nan::ObjectWrap::Unwrap<WifiWrap>(info.This());
  info.GetReturnValue().Set(Nan::New(handle->status()));
}

void InitModule(Handle<Object> target) {
  WifiWrap::Init(target);
}

NODE_MODULE(wifi, InitModule);
