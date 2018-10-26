#include "WifiNative.h"
#include <iotjs_helper.h>
#include <arpa/nameser.h>
#include <netinet/in.h>
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
    jerry_char_t ssid_buf[ssidlen + 1];
    jerry_string_to_char_buffer(jargv[0], ssid_buf, ssidlen);
    ssid_buf[ssidlen] = '\0';
    strncpy(config.ssid, (const char*)ssid_buf, ssidlen);
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
      jerry_char_t psk_buf[psklen + 1];
      jerry_string_to_char_buffer(jargv[1], psk_buf, psklen);
      psk_buf[psklen] = '\0';
      strncpy(config.psk, (const char*)psk_buf, psklen);
      config.key_mgmt = key_mgmt;
    }
  } else {
    config.key_mgmt = WIFI_KEY_NONE;
  }

  int r = wifi_join_network(&config);
  if (r != 0)
    return JS_CREATE_ERROR(COMMON, "join network failed");
  return jerry_create_number(config.id);
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

JS_FUNCTION(GetWifiList) {
  struct wifi_scan_list list;
  wifi_get_scan_result(&list);

  jerry_value_t jlist = jerry_create_array(list.num);
  for (uint32_t i = 0; i < list.num; i++) {
    jerry_value_t jitem = jerry_create_object();
    jerry_value_t jssid_name = jerry_create_string((const jerry_char_t*)"ssid");
    jerry_value_t jssid_val =
        jerry_create_string((const jerry_char_t*)list.ssid[i].ssid);
    jerry_value_t jsig_name =
        jerry_create_string((const jerry_char_t*)"signal");
    jerry_value_t jsig_val = jerry_create_number(list.ssid[i].sig);

    jerry_set_property(jitem, jssid_name, jssid_val);
    jerry_set_property(jitem, jsig_name, jsig_val);
    jerry_set_property_by_index(jlist, i, jitem);

    // release
    jerry_release_value(jsig_val);
    jerry_release_value(jssid_name);
    jerry_release_value(jssid_val);
    jerry_release_value(jsig_name);
    jerry_release_value(jitem);
  }
  return jlist;
}

JS_FUNCTION(EnableScanPassively) {
  int r = wifi_enable_all_network();
  return jerry_create_number(r);
}

JS_FUNCTION(DisableAll) {
  int r = wifi_disable_all_network();
  return jerry_create_number(r);
}

JS_FUNCTION(Reconfigure) {
  wifi_reconfigure();
  return jerry_create_boolean(true);
}

JS_FUNCTION(ResetDns) {
  res_init();
  fprintf(stdout, "reset dns cache\n");
  return jerry_create_boolean(true);
}

JS_FUNCTION(Scan) {
  wifi_scan();
  return jerry_create_boolean(true);
}

JS_FUNCTION(ResetWifi) {
  wifi_clear_scan_results();
  return jerry_create_boolean(true);
}

JS_FUNCTION(Save) {
  wifi_save_network();
  return jerry_create_boolean(true);
}

JS_FUNCTION(GetLocalAddress) {
  int r = 0;
  char ip[16] = { 0 };

  r = get_local_ip("wlan", ip);
  if (r == -1) {
    return jerry_create_boolean(false);
  } else {
    return jerry_create_string((const jerry_char_t*)ip);
  }
}

JS_FUNCTION(GetNumOfHistory) {
  int num = 0;
  int r = 0;

  r = wifi_get_listnetwork(&num);
  if (r != 0)
    return JS_CREATE_ERROR(COMMON, "get wifi configure list error");
  return jerry_create_number(num);
}

JS_FUNCTION(RemoveNetwork) {
  int id = JS_GET_ARG(0, number);
  int r = wifi_remove_network(&id);
  return jerry_create_number(r);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "joinNetwork", JoinNetwork);
  iotjs_jval_set_method(exports, "getWifiState", GetWifiState);
  iotjs_jval_set_method(exports, "getNetworkState", GetNetworkState);
  iotjs_jval_set_method(exports, "getWifiList", GetWifiList);
  iotjs_jval_set_method(exports, "enableScanPassively", EnableScanPassively);
  iotjs_jval_set_method(exports, "disableAll", DisableAll);
  iotjs_jval_set_method(exports, "reconfigure", Reconfigure);
  iotjs_jval_set_method(exports, "resetDns", ResetDns);
  iotjs_jval_set_method(exports, "resetWifi", ResetWifi);
  iotjs_jval_set_method(exports, "scan", Scan);
  iotjs_jval_set_method(exports, "save", Save);
  iotjs_jval_set_method(exports, "getLocalAddress", GetLocalAddress);
  iotjs_jval_set_method(exports, "getNumOfHistory", GetNumOfHistory);
  iotjs_jval_set_method(exports, "removeNetwork", RemoveNetwork);

  IOTJS_SET_CONSTANT(exports, WPA_ALL_NETWORK);
}

NODE_MODULE(wifi, init)
