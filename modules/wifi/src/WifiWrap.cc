#include "src/WifiWrap.h"
#include <netinet/in.h>
#include <arpa/nameser.h>
#include <resolv.h>

using namespace v8;
using namespace std;

class ConnectWorker : public Nan::AsyncWorker {
 public:
  ConnectWorker(Nan::Callback *callback, struct wifi_network network)
    : AsyncWorker(callback), network_(network) {}
  ~ConnectWorker() {}
  void Execute () {
    wifi_join_network(&network_);
    // FIXME(Yorkie): dont reset
    // dhcp_reset();
  }
  void HandleOKCallback () {
    Nan::HandleScope scope;
    Local<Value> argv[] = { 
      Nan::Null()
    };
    callback->Call(1, argv);
  }
 private:
  struct wifi_network network_;
};

WifiWrap::WifiWrap() {
  memset(network_.ssid, 0, 36);
  memset(network_.psk, 0, 68);
}

WifiWrap::~WifiWrap() {
  // TODO
}

int WifiWrap::status() {
  int v;
  network_get_status(&v);
  return v;
}

NAN_MODULE_INIT(WifiWrap::Init) {
  Local<FunctionTemplate> tmpl = Nan::New<FunctionTemplate>(New);
  tmpl->SetClassName(Nan::New("WifiWrap").ToLocalChecked());
  tmpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tmpl, "save", Save);
  Nan::SetPrototypeMethod(tmpl, "connect", Connect);
  Nan::SetPrototypeMethod(tmpl, "disconnect", Disconnect);
  Nan::SetPrototypeMethod(tmpl, "getStatus", GetStatus);
  Nan::SetPrototypeMethod(tmpl, "res_init", ResInit);

  Local<Function> func = Nan::GetFunction(tmpl).ToLocalChecked();
  Nan::Set(target, Nan::New("WifiWrap").ToLocalChecked(), func);
}

NAN_METHOD(WifiWrap::New) {
  WifiWrap* handle = new WifiWrap();
  handle->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(WifiWrap::Save) {
  wifi_save_network();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(WifiWrap::Connect) {
  WifiWrap* handle = Nan::ObjectWrap::Unwrap<WifiWrap>(info.This());
  v8::String::Utf8Value ssid(info[0].As<String>());
  v8::String::Utf8Value psk(info[1].As<String>());
  int method = info[2]->NumberValue();

  char* ssid_str = strdup(*ssid);
  char* psk_str = strdup(*psk);

  memset(handle->network_.ssid, 0, 36);
  memcpy(handle->network_.ssid, ssid_str, ssid.length());
  memset(handle->network_.psk, 0, 68);
  memcpy(handle->network_.psk, psk_str, psk.length());
  
  fprintf(stdout, "connection wifi <ssid: %s, psk: %s>\n",
    handle->network_.ssid,
    handle->network_.psk);
  handle->network_.key_mgmt = method;

  Nan::Callback *callback = new Nan::Callback(info[3].As<Function>());
  Nan::AsyncQueueWorker(new ConnectWorker(callback, handle->network_));
}

NAN_METHOD(WifiWrap::Disconnect) {
  wifi_disable_all_network();
  // FIXME(Yorkie): dont save network
  // wifi_save_network();
  info.GetReturnValue().Set(Nan::True());
}

NAN_METHOD(WifiWrap::GetStatus) {
  WifiWrap* handle = Nan::ObjectWrap::Unwrap<WifiWrap>(info.This());
  info.GetReturnValue().Set(Nan::New(handle->status()));
}

NAN_METHOD(WifiWrap::ResInit) {
  res_init();
  info.GetReturnValue().Set(info.This());
}

void InitModule(Handle<Object> target) {
  WifiWrap::Init(target);
}

NODE_MODULE(wifi, InitModule);
