#include <arpa/nameser.h>
#include <netinet/in.h>
#include <resolv.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <node_api.h>
#include <stdio.h>
#include <common.h>
#include <stdint.h>
#include <wpa_command.h>

static napi_value JoinNetwork(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  static wifi_network config = { 0 };
  memset(&config, 0, sizeof(config));
  size_t argc = 3;
  napi_value argv[3];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  int key_mgmt;
  napi_get_value_int32(env, argv[2], &key_mgmt);
  size_t ssidlen = -1;
  size_t ssidsize;
  size_t psklen = -1;
  size_t psksize;
  napi_status status =
      napi_get_value_string_utf8(env, argv[0], NULL, 0, &ssidlen);
  if (status == napi_string_expected) {
    napi_throw_type_error(env, NULL, "ssid must be a string");
    return NULL;
  }
  char ssid_buf[ssidlen + 1];
  napi_get_value_string_utf8(env, argv[0], ssid_buf, ssidlen + 1, &ssidsize);
  ssid_buf[ssidsize] = '\0';
  strncpy(config.ssid, (const char*)ssid_buf, ssidsize);
  status = napi_get_value_string_utf8(env, argv[1], NULL, 0, &psklen);
  if (status == napi_string_expected) {
    config.key_mgmt = WIFI_KEY_NONE;
  } else {
    if (psklen == 0 || key_mgmt == WIFI_KEY_NONE) {
      config.key_mgmt = WIFI_KEY_NONE;
    } else {
      char psk_buf[psklen + 1];
      napi_get_value_string_utf8(env, argv[1], psk_buf, psklen, &psksize);
      psk_buf[psklen] = '\0';
      strncpy(config.psk, (const char*)psk_buf, psklen);
      config.key_mgmt = key_mgmt;
    }
  }
  int r = wifi_join_network(&config);
  if (r != 0) {
    napi_throw_error(env, NULL, "join network failed");
    return NULL;
  }
  napi_create_int32(env, config.id, &returnVal);
  return returnVal;
}

static napi_value GetWifiState(napi_env env, napi_callback_info info) {
  int state = -1;
  napi_value returnVal;
  wifi_get_status(&state);
  napi_create_int32(env, state, &returnVal);
  return returnVal;
}

static napi_value GetNetworkState(napi_env env, napi_callback_info info) {
  int state = -1;
  napi_value returnVal;
  network_get_status(&state);
  napi_create_int32(env, state, &returnVal);
  return returnVal;
}

static napi_value GetWifiList(napi_env env, napi_callback_info info) {
  struct wifi_scan_list list;
  wifi_get_scan_result(&list);
  napi_value jlist;
  napi_create_array(env, &jlist);
  for (uint32_t i = 0; i < list.num; i++) {
    napi_value obj;
    napi_value jssid_name;
    napi_value jssid_val;
    napi_value jsig_name;
    napi_value jsig_val;
    napi_create_object(env, &obj);
    napi_create_string_utf8(env, "ssid", strlen("ssid"), &jssid_name);
    napi_create_string_utf8(env, list.ssid[i].ssid, strlen(list.ssid[i].ssid),
                            &jssid_val);
    napi_create_string_utf8(env, "signal", strlen("signal"), &jsig_name);
    napi_create_double(env, list.ssid[i].sig, &jsig_val);
    napi_set_property(env, obj, jssid_name, jssid_val);
    napi_set_property(env, obj, jsig_name, jsig_val);
    napi_set_element(env, jlist, i, obj);
  }
  return jlist;
}

static napi_value EnableScanPassively(napi_env env, napi_callback_info info) {
  int r = wifi_enable_all_network();
  napi_value returnVal;
  napi_create_int32(env, r, &returnVal);
  return returnVal;
}

static napi_value DisableAll(napi_env env, napi_callback_info info) {
  int r = wifi_disable_all_network();
  napi_value returnVal;
  napi_create_int32(env, r, &returnVal);
  return returnVal;
}

static napi_value Reconfigure(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  wifi_reconfigure();
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}

static napi_value ResetDns(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  res_init();
  fprintf(stdout, "reset dns cache\n");
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}

static napi_value Scan(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  wifi_scan();
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}

static napi_value ResetWifi(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  wifi_clear_scan_results();
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}

static napi_value Save(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  wifi_save_network();
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}

static napi_value GetLocalAddress(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  int r = 0;
  char ip[16] = { 0 };
  r = get_local_ip("wlan", ip);
  if (r == -1) {
    napi_get_boolean(env, false, &returnVal);
    return returnVal;
  }
  napi_create_string_utf8(env, ip, strlen(ip), &returnVal);
  return returnVal;
}

static napi_value GetNumOfHistory(napi_env env, napi_callback_info info) {
  int num = 0;
  int r = 0;
  napi_value returnVal;
  r = wifi_get_config_network(&num);
  if (r != 0) {
    napi_throw_error(env, NULL, "get wifi configure list error");
    return NULL;
  }
  napi_create_int32(env, num, &returnVal);
  return returnVal;
}

static napi_value RemoveNetwork(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  int id;
  napi_get_value_int32(env, argv[0], &id);
  int r = wifi_remove_network(&id);
  napi_create_int32(env, r, &returnVal);
  return returnVal;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("joinNetwork", JoinNetwork),
    DECLARE_NAPI_PROPERTY("getWifiState", GetWifiState),
    DECLARE_NAPI_PROPERTY("getNetworkState", GetNetworkState),
    DECLARE_NAPI_PROPERTY("getWifiList", GetWifiList),
    DECLARE_NAPI_PROPERTY("enableScanPassively", EnableScanPassively),
    DECLARE_NAPI_PROPERTY("disableAll", DisableAll),
    DECLARE_NAPI_PROPERTY("reconfigure", Reconfigure),
    DECLARE_NAPI_PROPERTY("resetDns", ResetDns),
    DECLARE_NAPI_PROPERTY("resetWifi", ResetWifi),
    DECLARE_NAPI_PROPERTY("scan", Scan),
    DECLARE_NAPI_PROPERTY("save", Save),
    DECLARE_NAPI_PROPERTY("getLocalAddress", GetLocalAddress),
    DECLARE_NAPI_PROPERTY("getNumOfHistory", GetNumOfHistory),
    DECLARE_NAPI_PROPERTY("removeNetwork", RemoveNetwork),
  };
  napi_define_properties(env, exports, sizeof(desc) / sizeof(*desc), desc);
  NAPI_SET_CONSTANT(exports, WPA_ALL_NETWORK);
  return exports;
}

NAPI_MODULE(wifi, Init)