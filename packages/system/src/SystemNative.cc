#include "SystemNative.h"
#include <sys/statvfs.h>
#include <recovery/recovery.h>


JS_FUNCTION(Reboot) {
  int ret = system("reboot");
  return jerry_create_number(ret);
}

JS_FUNCTION(VerifyOtaImage) {
  return jerry_create_boolean(true);
}

JS_FUNCTION(PrepareOta) {
  iotjs_string_t iotjs_path = JS_GET_ARG(0, string);
  const char* path = iotjs_string_data(&iotjs_path);

  const char *mode, *state;
  if (strlen(path) == 0) {
    /**
     * clear recovery state
     */
    mode = "initmode";
    state = "";
  } else {
    mode = BOOTMODE_RECOVERY;
    state = BOOTSTATE_READY;
  }

  int status;
  struct boot_cmd cmd;
  memset(&cmd, 0, sizeof(cmd));
  status = get_recovery_cmd_status(&cmd);
  if (status != 0) {
    iotjs_string_destroy(&iotjs_path);
    return jerry_create_number(status);
  }
  strncpy(cmd.boot_mode, mode, strlen(mode));
  strncpy(cmd.recovery_path, path, strlen(path));
  strncpy(cmd.recovery_state, state, strlen(state));
  status = set_recovery_cmd_status(&cmd);

  iotjs_string_destroy(&iotjs_path);
  return jerry_create_number(status);
}

JS_FUNCTION(DiskUsage) {
  iotjs_string_t iotjs_path = JS_GET_ARG(0, string);
  const char* path = iotjs_string_data(&iotjs_path);

  struct statvfs info = {};
  int ret = statvfs(path, &info);
  iotjs_string_destroy(&iotjs_path);
  if (ret) {
    int errnum = errno;
    return jerry_create_error(JERRY_ERROR_COMMON, (jerry_char_t*)strerror(errnum));
  }

  jerry_value_t res = jerry_create_object();
  iotjs_jval_set_property_number(res, "available", info.f_bavail * info.f_frsize);
  iotjs_jval_set_property_number(res, "free", info.f_bfree * info.f_frsize);
  iotjs_jval_set_property_number(res, "total", info.f_blocks * info.f_frsize);
  return res;
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "verifyOtaImage", VerifyOtaImage);
  iotjs_jval_set_method(exports, "prepareOta", PrepareOta);
  iotjs_jval_set_method(exports, "reboot", Reboot);
  iotjs_jval_set_method(exports, "diskUsage", DiskUsage);
}

NODE_MODULE(system, init)
