#include "BluetoothNative.h"

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_bluetooth_destroy
};

static iotjs_bluetooth_t* iotjs_bluetooth_create(jerry_value_t jbluetooth) {
  iotjs_bluetooth_t* bluetooth = IOTJS_ALLOC(iotjs_bluetooth_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_bluetooth_t, bluetooth);

  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jbluetooth, &this_module_native_info);
  _this->prepared = false;
  return bluetooth;
}

static void iotjs_bluetooth_destroy(iotjs_bluetooth_t* bluetooth) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_bluetooth_t, bluetooth);
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(bluetooth);
}

JS_FUNCTION(Bluetooth) {
  DJS_CHECK_THIS();
  
  const jerry_value_t jbluetooth = JS_GET_THIS();
  iotjs_bluetooth_t* bluetooth = iotjs_bluetooth_create(jbluetooth);
  return jerry_create_undefined();
}

JS_FUNCTION(EnableBle) {
  JS_DECLARE_THIS_PTR(bluetooth, bluetooth);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_bluetooth_t, bluetooth);

  return jerry_create_boolean(true);
}

JS_FUNCTION(DisableBle) {
  JS_DECLARE_THIS_PTR(bluetooth, bluetooth);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_bluetooth_t, bluetooth);

  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  jerry_value_t jconstructor = jerry_create_external_function(Bluetooth);
  iotjs_jval_set_property_jval(exports, "BluetoothWrap", jconstructor);
  
  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "enableBle", EnableBle);
  iotjs_jval_set_method(proto, "disableBle", DisableBle);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(bluetooth, init)
