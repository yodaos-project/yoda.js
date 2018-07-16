#include "SystemNative.h"
#include <recovery/recovery.h>

#define UPGRADE_OTA_PATH "/data/upgrade/upgrade.img"

JS_FUNCTION(VerifyImage) {
  return jerry_create_boolean(true);
}

JS_FUNCTION(PrepareImage) {
  struct boot_cmd cmd;
  memset(&cmd, 0, sizeof(cmd));
  strncpy(cmd.boot_mode, BOOTMODE_RECOVERY, strlen(BOOTMODE_RECOVERY));
  strncpy(cmd.recovery_path, UPGRADE_OTA_PATH, strlen(UPGRADE_OTA_PATH));
  strncpy(cmd.recovery_state, BOOTSTATE_READY, strlen(BOOTSTATE_READY));
  set_recovery_cmd_status(&cmd);
  return jerry_create_boolean(true);
}

JS_FUNCTION(Reboot) {
  system("reboot");
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "verifyImage", VerifyImage);
  iotjs_jval_set_method(exports, "prepareImage", PrepareImage);
  iotjs_jval_set_method(exports, "reboot", Reboot);
}

NODE_MODULE(system, init)

