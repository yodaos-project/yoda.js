#ifndef LIGHT_NATIVE_H
#define LIGHT_NATIVE_H

#include <stdio.h>

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
  char* buffer;
  size_t length;
} IOTJS_VALIDATED_STRUCT(iotjs_bufferwrap_t);

extern iotjs_bufferwrap_t* iotjs_bufferwrap_from_jbuffer(const jerry_value_t jbuffer);
extern char* iotjs_bufferwrap_buffer(iotjs_bufferwrap_t* bufferwrap);
extern size_t iotjs_bufferwrap_length(iotjs_bufferwrap_t* bufferwrap);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // LIGHT_NATIVE_H
