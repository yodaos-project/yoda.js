#include "WifiNative.h"
#include <netinet/in.h>
#include <arpa/nameser.h>
#include <resolv.h>
#include <unistd.h>
#include <wpa_command.h>

JS_FUNCTION(JoinNetwork) {
  static wifi_network config = { 0 };
  memset(&config, 0, sizeof(config));

  jerry_size_t ssidlen = -1;
  jerry_size_t psklen = -1;
  int key_mgmt = JS_GET_ARG(2, number);
  
  // parse the ssid
  if (jerry_value_is_string(jargv[0])) {
    ssidlen = jerry_get_string_size(jargv[0]);
    jerry_char_t ssid_buf[ssidlen];
    jerry_string_to_char_buffer(jargv[0], ssid_buf, ssidlen);
    ssid_buf[ssidlen] = '\0';
    strncpy(config.ssid, ssid_buf, sizeof(ssid_buf));
  } else {
    return JS_CREATE_ERROR(COMMON, "ssid must be a string");
  }

  // parse the psk
  if (jerry_value_is_string(jargv[1])) {
    psklen = jerry_get_string_size(jargv[1]);
    // if psk is empty string or key_mgmt is none, pass 
    // WIFI_KEY_NONE as key_mgmt.
    if (psklen == 0 || key_mgmt == WIFI_KEY_NONE) {
      config.key_mgmt = WIFI_KEY_NONE;
    } else {
      jerry_char_t psk_buf[psklen];
      jerry_string_to_char_buffer(jargv[1], psk_buf, psklen);
      psk_buf[psklen] = '\0';
      strncpy(config.psk, psk_buf, sizeof(psk_buf));
      config.key_mgmt = key_mgmt;
    }
  } else {
    config.key_mgmt = WIFI_KEY_NONE;
  }
  
  int r = wifi_join_network(&config);
  if (r != 0)
    return JS_CREATE_ERROR(COMMON, "join network failed");
  return jerry_create_number(r);
}

JS_FUNCTION(GetWifiState) {
  int state = -1;
  wifi_get_status(&state);
  return jerry_create_number(state);
}

JS_FUNCTION(GetNetworkState) {
  int state = -1;
  network_get_status(&state);
  return jerry_create_number(state);
}

JS_FUNCTION(DisableAll) {
  int r = wifi_disable_all_network();
  return jerry_create_number(r);
}

JS_FUNCTION(ResetDns) {
  res_init();
  return jerry_create_boolean(true);
}

JS_FUNCTION(Save) {
  wifi_save_network();
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "joinNetwork", JoinNetwork);
  iotjs_jval_set_method(exports, "getWifiState", GetWifiState);
  iotjs_jval_set_method(exports, "getNetworkState", GetNetworkState);
  iotjs_jval_set_method(exports, "disableAll", DisableAll);
  iotjs_jval_set_method(exports, "resetDns", ResetDns);
  iotjs_jval_set_method(exports, "save", Save);
}

NODE_MODULE(wifi, init)

