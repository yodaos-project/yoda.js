#include <btflinger/btflinger_api.h>
#include <btflinger/bluetooth_msgque.h>
#include "BluetoothWrap.h"

using namespace v8;
using namespace std;

class GetRespWorker : public Nan::AsyncWorker {
public:
  GetRespWorker(Nan::Callback *callback)
    : AsyncWorker(callback) {}
  ~GetRespWorker() {}
  void Execute () {
    bluetooth_rokid_get_ble_rsp(&msg);
  }
  void HandleOKCallback () {
    Nan::HandleScope scope;
    char data[msg.id_pwd.length];
    memcpy(data, msg.id_pwd.value, sizeof(data));

    Local<Value> argv[] = {
      Nan::Null(), 
      Nan::New(data).ToLocalChecked()
    };
    callback->Call(2, argv);
  }
 private:
  struct bt_ble_rsp_msg msg;
};

BluetoothWrap::BluetoothWrap() {
  // TODO
}

BluetoothWrap::~BluetoothWrap() {
  // TODO
}

NAN_MODULE_INIT(BluetoothWrap::Init) {
  Local<FunctionTemplate> tmpl = Nan::New<FunctionTemplate>(New);
  tmpl->SetClassName(Nan::New("BluetoothWrap").ToLocalChecked());
  tmpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tmpl, "open", Open);
  Nan::SetPrototypeMethod(tmpl, "close", Close);
  Nan::SetPrototypeMethod(tmpl, "enableA2DP", EnableA2DP);
  Nan::SetPrototypeMethod(tmpl, "enableA2DPSink", EnableA2DPSink);
  Nan::SetPrototypeMethod(tmpl, "enableA2DPLink", EnableA2DPLink);
  Nan::SetPrototypeMethod(tmpl, "sendCommand", SendCommand);
  Nan::SetPrototypeMethod(tmpl, "enableBLE", EnableBLE);
  Nan::SetPrototypeMethod(tmpl, "disableBLE", DisableBLE);
  Nan::SetPrototypeMethod(tmpl, "getBleResp", BLE_GetResp);
  Nan::SetPrototypeMethod(tmpl, "sendBleResp", BLE_SendResp);

  Local<Function> func = Nan::GetFunction(tmpl).ToLocalChecked();
  Nan::Set(target, Nan::New("BluetoothWrap").ToLocalChecked(), func);

  bluetooth_create_queue();
  bluetooth_create_rsp_queue();
}

NAN_METHOD(BluetoothWrap::New) {
  BluetoothWrap* bluetooth = new BluetoothWrap();
  bluetooth->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::Open) {
  String::Utf8Value name(info[0]);
  bluetooth_rokid_open(*name);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::Close) {
  bluetooth_rokid_close();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::EnableA2DP) {
  bluetooth_rokid_use_a2dp();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::EnableA2DPSink) {
  bluetooth_rokid_use_a2dp_sink();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::EnableA2DPLink) {
  // bluetooth_rokid_use_a2dp_link();
  // info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::SendCommand) {
  int cmd = info[0]->NumberValue();
  bluetooth_rokid_use_avrcp_cmd((bluetooth_avrcp_cmd)(cmd));
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::EnableBLE) {
  String::Utf8Value name(info[0]);
  bluetooth_rokid_use_ble(*name);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::DisableBLE) {
  bluetooth_rokid_use_ble_close();
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::BLE_SendResp) {
  v8::String::Utf8Value data(info[0].As<String>());
  unsigned char* data_str = (unsigned char*)strdup(*data);
  bluetooth_rokid_send_ble_rsp(data_str, data.length());
  free(data_str);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(BluetoothWrap::BLE_GetResp) {
  Nan::Callback *callback = new Nan::Callback(info[0].As<Function>());
  AsyncQueueWorker(new GetRespWorker(callback));
}

void InitModule(Handle<Object> target) {
  BluetoothWrap::Init(target);
}

NODE_MODULE(lumen, InitModule);

