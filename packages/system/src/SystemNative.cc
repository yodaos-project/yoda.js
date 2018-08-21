#include "SystemNative.h"
#include <recovery/recovery.h>


JS_FUNCTION(Reboot) {
  system("reboot");
  return jerry_create_boolean(true);
}

JS_FUNCTION(VerifyOtaImage) {
  return jerry_create_boolean(true);
}

JS_FUNCTION(PrepareOta) {
  iotjs_string_t iotjs_path = JS_GET_ARG(0, string);
  const char* path = iotjs_string_data(&iotjs_path);
  iotjs_string_destroy(&iotjs_path);

  const char *mode, *state;
  if (strlen(path) == 0) {
    /**
     * clear recovery state
     */
    mode = "initmode";
    state = "";
  } else {
    mode = BOOTMODE_RECOVERY;
    state = BOOTSTATE_READY
  }

  int status;
  struct boot_cmd cmd;
  memset(&cmd, 0, sizeof(cmd));
  status = get_recovery_cmd_status(&cmd);
  if (status != 0) {
    return jerry_create_number(status);
  }
  strncpy(cmd.boot_mode, mode, strlen(mode));
  strncpy(cmd.recovery_path, path, strlen(path));
  strncpy(cmd.recovery_state, state, strlen(state));
  status = set_recovery_cmd_status(&cmd);
  return jerry_create_number(status);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "verifyOtaImage", VerifyOtaImage);
  iotjs_jval_set_method(exports, "prepareOta", PrepareOta);
  iotjs_jval_set_method(exports, "reboot", Reboot);
}

NODE_MODULE(system, init)
