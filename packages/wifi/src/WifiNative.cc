#include "WifiNative.h"
#include <unistd.h>
#include <wpa_command.h>

JS_FUNCTION(JoinNetwork) {
  char* ssid;
  char* psk;
  for (int i = 0; i < 2; i++) {
    jerry_size_t size = jerry_get_string_size(jargv[i]);
    jerry_char_t text_buf[size];
    jerry_string_to_char_buffer(jargv[i], text_buf, size);
    text_buf[size] = '\0';
    switch (i) {
      case 0: ssid = strdup((char*)&text_buf); break;
      case 1: psk = strdup((char*)&text_buf); break;
      default:
        break;
    }
  }
  
  static wifi_network config = { 0 };
  memset(&config, 0, sizeof(config));
  strncpy(config.ssid, ssid, sizeof(ssid));
  strncpy(config.psk, psk, sizeof(psk));
  
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

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "joinNetwork", JoinNetwork);
  iotjs_jval_set_method(exports, "getWifiState", GetWifiState);
  iotjs_jval_set_method(exports, "getNetworkState", GetNetworkState);
  iotjs_jval_set_method(exports, "disableAll", DisableAll);
}

NODE_MODULE(volume, init)

