#define _XOPEN_SOURCE

#include "SystemNative.h"
#include <recovery/recovery.h>
#include <sys/statvfs.h>
#include <time.h>

JS_FUNCTION(Reboot) {
  return jerry_create_number(system("reboot"));
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
  /** include last \0 */
  strncpy(cmd.boot_mode, mode, strlen(mode) + 1);
  strncpy(cmd.recovery_path, path, strlen(path) + 1);
  strncpy(cmd.recovery_state, state, strlen(state) + 1);
  status = set_recovery_cmd_status(&cmd);

  iotjs_string_destroy(&iotjs_path);
  return jerry_create_number(status);
}

JS_FUNCTION(GetRecoveryState) {
  int status;
  struct boot_cmd cmd;
  memset(&cmd, 0, sizeof(cmd));
  status = get_recovery_cmd_status(&cmd);

  jerry_value_t jval = jerry_create_object();
  iotjs_jval_set_property_string_raw(jval, "boot_mode", cmd.boot_mode);
  iotjs_jval_set_property_string_raw(jval, "recovery_path", cmd.recovery_path);
  iotjs_jval_set_property_string_raw(jval, "recovery_state", cmd.recovery_state);
  return jval;
}

JS_FUNCTION(SetRecoveryOk) {
  struct boot_cmd cmd;
  const char* state = BOOTSTATE_NONE;
  memset(&cmd, 0, sizeof(cmd));
  strncpy(cmd.recovery_state, state, strlen(state) + 1);
  int status = set_recovery_cmd_status(&cmd);
  return jerry_create_number(status);
}

JS_FUNCTION(SetRecoveryMode) {
  set_boot_flush_data();
  return jerry_create_boolean(true);
}

JS_FUNCTION(DiskUsage) {
  iotjs_string_t iotjs_path = JS_GET_ARG(0, string);
  const char* path = iotjs_string_data(&iotjs_path);

  struct statvfs info = {};
  int ret = statvfs(path, &info);
  iotjs_string_destroy(&iotjs_path);
  if (ret) {
    int errnum = errno;
    return jerry_create_error(JERRY_ERROR_COMMON,
                              (jerry_char_t*)strerror(errnum));
  }

  jerry_value_t res = jerry_create_object();
  iotjs_jval_set_property_number(res, "available",
                                 info.f_bavail * info.f_frsize);
  iotjs_jval_set_property_number(res, "free", info.f_bfree * info.f_frsize);
  iotjs_jval_set_property_number(res, "total", info.f_blocks * info.f_frsize);
  return res;
}

JS_FUNCTION(Strptime) {
  struct tm tm;
  memset(&tm, 0, sizeof(struct tm));

  // datetime as the first argument
  char* datetime = NULL;
  jerry_size_t datetime_size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t datetime_buf[datetime_size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], datetime_buf, datetime_size);
  datetime_buf[datetime_size] = '\0';
  datetime = (char*)&datetime_buf;

  // format as the first argument
  char* format = NULL;
  jerry_size_t format_size = jerry_get_utf8_string_size(jargv[1]);
  jerry_char_t format_buf[format_size + 1];
  jerry_string_to_utf8_char_buffer(jargv[1], format_buf, format_size);
  format_buf[format_size] = '\0';
  format = (char*)&format_buf;

  strptime(datetime, format, &tm);
  jerry_value_t jtime = jerry_create_object();
  iotjs_jval_set_property_number(jtime, "seconds", tm.tm_sec);
  iotjs_jval_set_property_number(jtime, "minutes", tm.tm_min);
  iotjs_jval_set_property_number(jtime, "hours", tm.tm_hour);
  iotjs_jval_set_property_number(jtime, "date", tm.tm_mday);
  iotjs_jval_set_property_number(jtime, "month", tm.tm_mon + 1);
  iotjs_jval_set_property_number(jtime, "year", tm.tm_year + 1900);
  return jtime;
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "reboot", Reboot);
  iotjs_jval_set_method(exports, "verifyOtaImage", VerifyOtaImage);
  iotjs_jval_set_method(exports, "prepareOta", PrepareOta);
  iotjs_jval_set_method(exports, "getRecoveryState", GetRecoveryState);
  iotjs_jval_set_method(exports, "setRecoveryMode", SetRecoveryMode);
  iotjs_jval_set_method(exports, "setRecoveryOk", SetRecoveryOk);
  iotjs_jval_set_method(exports, "diskUsage", DiskUsage);
  iotjs_jval_set_method(exports, "strptime", Strptime);
}

NODE_MODULE(system, init)
