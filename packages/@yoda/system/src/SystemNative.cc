#define _XOPEN_SOURCE
#include <node_api.h>
#include <recovery/recovery.h>
#include <sys/statvfs.h>
#include <time.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <common.h>
#include <errno.h>

static napi_value PowerOff(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  napi_create_double(env, system("poweroff"), &returnVal);
  return returnVal;
}

static napi_value RebootCharging(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  napi_create_double(env, system("rokid_reboot charging"), &returnVal);
  return returnVal;
}

static napi_value Reboot(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  napi_create_double(env, system("reboot"), &returnVal);
  return returnVal;
}

static napi_value VerifyOtaImage(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  napi_get_boolean(env, true, &returnVal);
  return returnVal;
}

static napi_value PrepareOta(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  napi_status status;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  size_t vallen;
  size_t valRes;
  napi_get_value_string_utf8(env, argv[0], NULL, 0, &vallen);
  char path[vallen + 1];
  napi_get_value_string_utf8(env, argv[0], path, vallen + 1, &valRes);
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
  int statusVal;
  struct boot_cmd cmd;
  memset(&cmd, 0, sizeof(cmd));
  statusVal = get_recovery_cmd_status(&cmd);
  if (statusVal != 0) {
    napi_create_int32(env, statusVal, &returnVal);
    return returnVal;
  }
  /** include last \0 */
  strncpy(cmd.boot_mode, mode, strlen(mode) + 1);
  strncpy(cmd.recovery_path, path, strlen(path) + 1);
  strncpy(cmd.recovery_state, state, strlen(state) + 1);
  statusVal = set_recovery_cmd_status(&cmd);
  napi_create_int32(env, statusVal, &returnVal);
  return returnVal;
}

static napi_value GetRecoveryState(napi_env env, napi_callback_info info) {
  struct boot_cmd cmd;
  napi_value obj;
  napi_value key;
  napi_value value;
  memset(&cmd, 0, sizeof(cmd));
  get_recovery_cmd_status(&cmd);
  napi_create_object(env, &obj);
  char bootChar[] = "boot_mode";
  napi_create_string_utf8(env, bootChar, strlen(bootChar), &key);
  napi_create_string_utf8(env, cmd.boot_mode, strlen(cmd.boot_mode), &value);
  napi_set_property(env, obj, key, value);
  char recpChar[] = "recovery_path";
  napi_create_string_utf8(env, recpChar, strlen(recpChar), &key);
  napi_create_string_utf8(env, cmd.recovery_path, strlen(cmd.recovery_path),
                          &value);
  napi_set_property(env, obj, key, value);
  char recsChar[] = "recovery_state";
  napi_create_string_utf8(env, recsChar, strlen(recsChar), &key);
  napi_create_string_utf8(env, cmd.recovery_state, strlen(cmd.recovery_state),
                          &value);
  napi_set_property(env, obj, key, value);
  return obj;
}

static napi_value SetRecoveryOk(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  struct boot_cmd cmd;
  const char* state = BOOTSTATE_NONE;
  const char* mode = "";
  const char* path = "";
  memset(&cmd, 0, sizeof(cmd));

  int statusVal;
  statusVal = get_recovery_cmd_status(&cmd);
  if (statusVal != 0) {
    napi_create_int32(env, statusVal, &returnVal);
    return returnVal;
  }
  strncpy(cmd.boot_mode, mode, strlen(mode) + 1);
  strncpy(cmd.recovery_path, path, strlen(mode) + 1);
  strncpy(cmd.recovery_state, state, strlen(state) + 1);

  int status = set_recovery_cmd_status(&cmd);
  napi_create_int32(env, status, &returnVal);
  return returnVal;
}


static napi_value SetRecoveryMode(napi_env env, napi_callback_info info) {
  napi_value returnVal;
  napi_get_boolean(env, true, &returnVal);
  set_boot_flush_data();
  return returnVal;
}

static napi_value DiskUsage(napi_env env, napi_callback_info backInfo) {
  napi_value key;
  napi_value value;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, backInfo, &argc, argv, 0, 0);
  size_t vallen;
  size_t valRes;
  napi_get_value_string_utf8(env, argv[0], NULL, 0, &vallen);
  char path[vallen + 1];
  napi_get_value_string_utf8(env, argv[0], path, vallen + 1, &valRes);
  struct statvfs info = {};
  int ret = statvfs(path, &info);
  if (ret) {
    int errnum = errno;
    napi_throw_error(env, NULL, strerror(errnum));
    return NULL;
  }
  napi_value obj;
  napi_create_object(env, &obj);
  char availableChar[] = "available";
  napi_create_string_utf8(env, availableChar, strlen(availableChar), &key);
  napi_create_double(env, info.f_bavail * info.f_frsize, &value);
  napi_set_property(env, obj, key, value);
  char freeChar[] = "free";
  napi_create_string_utf8(env, freeChar, strlen(freeChar), &key);
  napi_create_double(env, info.f_bfree * info.f_frsize, &value);
  napi_set_property(env, obj, key, value);
  char totalChar[] = "total";
  napi_create_string_utf8(env, totalChar, strlen(totalChar), &key);
  napi_create_double(env, info.f_blocks * info.f_frsize, &value);
  napi_set_property(env, obj, key, value);
  return obj;
}

static napi_value Strptime(napi_env env, napi_callback_info info) {
  size_t datetime_size;
  size_t format_size;
  size_t datetime_len;
  size_t format_len;
  struct tm tm;
  memset(&tm, 0, sizeof(struct tm));
  // datetime as the first argument
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, 0, 0);
  napi_get_value_string_utf8(env, argv[0], NULL, 0, &datetime_size);
  char datetime[datetime_size + 1];
  napi_get_value_string_utf8(env, argv[0], datetime, datetime_size + 1,
                             &datetime_len);
  napi_get_value_string_utf8(env, argv[1], NULL, 0, &format_size);
  char format[datetime_size + 1];
  napi_get_value_string_utf8(env, argv[1], format, format_size + 1,
                             &format_len);
  strptime(datetime, format, &tm);
  napi_value obj;
  napi_value value;
  napi_value key;
  napi_create_object(env, &obj);
  char secondsChar[] = "seconds";
  napi_create_string_utf8(env, secondsChar, strlen(secondsChar), &key);
  napi_create_double(env, tm.tm_sec, &value);
  napi_set_property(env, obj, key, value);
  char minutesChar[] = "minutes";
  napi_create_string_utf8(env, minutesChar, strlen(minutesChar), &key);
  napi_create_double(env, tm.tm_min, &value);
  napi_set_property(env, obj, key, value);
  char hoursChar[] = "hours";
  napi_create_string_utf8(env, hoursChar, strlen(hoursChar), &key);
  napi_create_double(env, tm.tm_hour, &value);
  napi_set_property(env, obj, key, value);
  char dateChar[] = "date";
  napi_create_string_utf8(env, dateChar, strlen(dateChar), &key);
  napi_create_double(env, tm.tm_mday, &value);
  napi_set_property(env, obj, key, value);
  char mouthChar[] = "month";
  napi_create_string_utf8(env, mouthChar, strlen(mouthChar), &key);
  napi_create_double(env, tm.tm_mon + 1, &value);
  napi_set_property(env, obj, key, value);
  char yearChar[] = "year";
  napi_create_string_utf8(env, yearChar, strlen(yearChar), &key);
  napi_create_double(env, tm.tm_year + 1900, &value);
  napi_set_property(env, obj, key, value);
  return obj;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("powerOff", PowerOff),
    DECLARE_NAPI_PROPERTY("rebootCharging", RebootCharging),
    DECLARE_NAPI_PROPERTY("reboot", Reboot),
    DECLARE_NAPI_PROPERTY("verifyOtaImage", VerifyOtaImage),
    DECLARE_NAPI_PROPERTY("prepareOta", PrepareOta),
    DECLARE_NAPI_PROPERTY("getRecoveryState", GetRecoveryState),
    DECLARE_NAPI_PROPERTY("setRecoveryMode", SetRecoveryMode),
    DECLARE_NAPI_PROPERTY("setRecoveryOk", SetRecoveryOk),
    DECLARE_NAPI_PROPERTY("diskUsage", DiskUsage),
    DECLARE_NAPI_PROPERTY("strptime", Strptime),
  };
  napi_define_properties(env, exports, sizeof(desc) / sizeof(*desc), desc);
  return exports;
}

NAPI_MODULE(system, Init)
