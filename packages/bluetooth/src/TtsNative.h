#ifndef BLUETOOTH_NATIVE_H
#define BLUETOOTH_NATIVE_H

#include <stdlib.h>
#include <stdio.h>
#include <librokid-bt/librokid-bt.h>

#ifdef __cplusplus
extern "C"
{
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  bool prepared;
} IOTJS_VALIDATED_STRUCT(iotjs_bluetooth_t);

static iotjs_bluetooth_t* iotjs_bluetooth_create(const jerry_value_t jbluetooth);
static void iotjs_bluetooth_destroy(iotjs_bluetooth_t* bluetooth);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // BLUETOOTH_NATIVE_H
