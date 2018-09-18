#ifndef ZMQ_NATIVE_H
#define ZMQ_NATIVE_H

#include <stdio.h>
#include <zmq.h>

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  void* socket;
  uv_poll_t poll_handle;
} IOTJS_VALIDATED_STRUCT(iotjs_zmq_t);

static iotjs_zmq_t* iotjs_zmq_socket_create(jerry_value_t jzmq, int type);
static void iotjs_zmq_destroy(iotjs_zmq_t* zmq);
static void iotjs_zmq_poll_cb(uv_poll_t* handle, int status, int events);

/**
 * include buffer
 */
typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  char* buffer;
  size_t length;
} IOTJS_VALIDATED_STRUCT(iotjs_bufferwrap_t);

extern iotjs_bufferwrap_t* iotjs_bufferwrap_from_jbuffer(
    const jerry_value_t jbuffer);
extern char* iotjs_bufferwrap_buffer(iotjs_bufferwrap_t* bufferwrap);
extern size_t iotjs_bufferwrap_length(iotjs_bufferwrap_t* bufferwrap);
extern jerry_value_t iotjs_bufferwrap_create_buffer(size_t len);
extern size_t iotjs_bufferwrap_copy(iotjs_bufferwrap_t* bufferwrap,
                                    const char* src, size_t len);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // ZMQ_NATIVE_H
