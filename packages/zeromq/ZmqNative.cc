#include "ZmqNative.h"
#define ZMQ_ERROR_MESSAGE zmq_strerror(zmq_errno())

static void* context = zmq_ctx_new();
static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_zmq_destroy
};

static iotjs_zmq_t* iotjs_zmq_create(jerry_value_t jzmq, int type) {
  iotjs_zmq_t* zmq = IOTJS_ALLOC(iotjs_zmq_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_zmq_t, zmq);

  jerry_value_t jzmqref = jerry_acquire_value(jzmq);
  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jzmqref,
                               &this_module_native_info);
  _this->socket = zmq_socket(context, type);
  _this->poll_handle.data = (void*)zmq;
  return zmq;
}

static void iotjs_zmq_destroy(iotjs_zmq_t* zmq) {
  printf("zmq destroyed\n");
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_zmq_t, zmq);
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(zmq);
}

static void iotjs_zmq_poll_cb(uv_poll_t* handle, int status, int events) {
  iotjs_zmq_t* zmq = (iotjs_zmq_t*)handle->data;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);
  jerry_value_t jthis = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);

  jerry_value_t onread = iotjs_jval_get_property(jthis, "onread");
  jerry_value_t onerror = iotjs_jval_get_property(jthis, "onerror");
  if (status != 0) {
    jerry_value_t error =
        jerry_create_error(JERRY_ERROR_TYPE,
                           (jerry_char_t*)"I/O status: socket not ready !=0.");
    jerry_value_t jargv[1] = { error };
    jerry_call_function(onerror, jthis, jargv, 1);
    jerry_release_value(error);
  } else {
    jerry_value_t jargv[0] = {};
    jerry_call_function(onread, jthis, jargv, 0);
  }

  jerry_release_value(onread);
  jerry_release_value(onerror);
}

JS_FUNCTION(ZMQ) {
  DJS_CHECK_THIS();

  const jerry_value_t jzmq = JS_GET_THIS();
  int type = (int)JS_GET_ARG(0, number);
  if (type < ZMQ_PAIR || type > ZMQ_STREAM) {
    return JS_CREATE_ERROR(COMMON, "invalid zeromq socket type.");
  }

  iotjs_zmq_t* zmq = iotjs_zmq_create(jzmq, type);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_zmq_t, zmq);

  uv_os_sock_t socket;
  size_t len = sizeof(uv_os_sock_t);
  if (zmq_getsockopt(_this->socket, ZMQ_FD, &socket, &len)) {
    return JS_CREATE_ERROR(COMMON, "invalid socket to get fd.");
  }

  // start poll
  uv_poll_init_socket(uv_default_loop(), &_this->poll_handle, socket);
  uv_poll_start(&_this->poll_handle, UV_READABLE, iotjs_zmq_poll_cb);
  return jerry_create_undefined();
}

JS_FUNCTION(Connect) {
  JS_DECLARE_THIS_PTR(zmq, zmq);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);

  if (_this->socket == NULL) {
    return JS_CREATE_ERROR(COMMON, "socket is not initialized.");
  }
  jerry_size_t size = jerry_get_string_size(jargv[0]);
  jerry_char_t url[size + 1];
  jerry_string_to_char_buffer(jargv[0], url, size);
  url[size] = '\0';

  int rc = zmq_connect(_this->socket, (const char*)url);
  if (rc != 0) {
    return JS_CREATE_ERROR(COMMON, "socket connecting failed.");
  }
  return jerry_create_boolean(true);
}

JS_FUNCTION(Subscribe) {
  JS_DECLARE_THIS_PTR(zmq, zmq);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);

  if (_this->socket == NULL) {
    return JS_CREATE_ERROR(COMMON, "socket is not initialized.");
  }
  jerry_size_t size = jerry_get_string_size(jargv[0]);
  jerry_char_t filter[size + 1];
  jerry_string_to_char_buffer(jargv[0], filter, size);
  filter[size] = '\0';

  if (zmq_setsockopt(_this->socket, ZMQ_SUBSCRIBE, filter, size)) {
    return JS_CREATE_ERROR(COMMON, ZMQ_ERROR_MESSAGE);
  }
  return jerry_create_boolean(true);
}

JS_FUNCTION(BindSync) {
  JS_DECLARE_THIS_PTR(zmq, zmq);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);

  if (_this->socket == NULL) {
    return JS_CREATE_ERROR(COMMON, "socket is not initialized.");
  }
  jerry_size_t size = jerry_get_string_size(jargv[0]);
  jerry_char_t url[size + 1];
  jerry_string_to_char_buffer(jargv[0], url, size);
  url[size] = '\0';

  int rc = zmq_bind(_this->socket, (const char*)url);
  if (rc != 0) {
    return JS_CREATE_ERROR(COMMON, "socket bind failed.");
  }
  return jerry_create_boolean(true);
}

JS_FUNCTION(UnbindSync) {
  JS_DECLARE_THIS_PTR(zmq, zmq);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);

  if (_this->socket == NULL) {
    return JS_CREATE_ERROR(COMMON, "socket is not initialized.");
  }
  jerry_size_t size = jerry_get_string_size(jargv[0]);
  jerry_char_t url[size + 1];
  jerry_string_to_char_buffer(jargv[0], url, size);
  url[size] = '\0';

  int rc = zmq_unbind(_this->socket, (const char*)url);
  if (rc != 0) {
    return JS_CREATE_ERROR(COMMON, "socket unbind failed.");
  }
  return jerry_create_boolean(true);
}

JS_FUNCTION(Recv) {
  JS_DECLARE_THIS_PTR(zmq, zmq);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);

  if (_this->socket == NULL) {
    return JS_CREATE_ERROR(COMMON, "socket is not initialized.");
  }

  int more = 1;
  size_t more_size = sizeof(more);

  int events;
  size_t events_size = sizeof(events);
  bool check_poll = true;
  bool has_data = false;
  jerry_value_t jresult;

  while (more == 1) {
    if (check_poll) {
      while (zmq_getsockopt(_this->socket, ZMQ_EVENTS, &events, &events_size)) {
        if (zmq_errno() != EINTR)
          return JS_CREATE_ERROR(COMMON, ZMQ_ERROR_MESSAGE);
      }
      if ((events & ZMQ_POLLIN) == 0) {
        return jerry_create_boolean(false);
      }
    }

    while (true) {
      char buf[1024] = { 0 };
      int rc = zmq_recv(_this->socket, buf, 1024, ZMQ_DONTWAIT);
      if (rc < 0) {
        if (zmq_errno() == EINTR)
          continue;
        return JS_CREATE_ERROR(COMMON, ZMQ_ERROR_MESSAGE);
      }
      jresult = iotjs_bufferwrap_create_buffer((size_t)rc);
      iotjs_bufferwrap_t* buffer = iotjs_bufferwrap_from_jbuffer(jresult);
      iotjs_bufferwrap_copy(buffer, (const char*)buf, (size_t)rc);
      has_data = true;
      break;
    }

    while (zmq_getsockopt(_this->socket, ZMQ_RCVMORE, &more, &more_size)) {
      if (zmq_errno() != EINTR)
        return JS_CREATE_ERROR(COMMON, ZMQ_ERROR_MESSAGE);
    }
  }
  return jresult;
}

JS_FUNCTION(Send) {
  JS_DECLARE_THIS_PTR(zmq, zmq);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);

  if (_this->socket == NULL) {
    return JS_CREATE_ERROR(COMMON, "socket is not initialized.");
  }

  iotjs_bufferwrap_t* buffer = iotjs_bufferwrap_from_jbuffer(jargv[0]);
  int srclen = (int)iotjs_bufferwrap_length(buffer);
  unsigned char* bytes = (unsigned char*)iotjs_bufferwrap_buffer(buffer);

  int rc = zmq_send(_this->socket, bytes, srclen, ZMQ_DONTWAIT);
  if (rc == -1) {
    return JS_CREATE_ERROR(COMMON, "send failed.");
  } else if (rc != srclen) {
    return JS_CREATE_ERROR(COMMON, "sent bytes incomplete.");
  }
  return jerry_create_number(rc);
}

JS_FUNCTION(Close) {
  JS_DECLARE_THIS_PTR(zmq, zmq);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_zmq_t, zmq);

  if (_this->socket == NULL) {
    return JS_CREATE_ERROR(COMMON, "socket is not initialized.");
  }

  uv_poll_stop(&_this->poll_handle);
  int rc = zmq_close(_this->socket);
  if (rc == -1) {
    return JS_CREATE_ERROR(COMMON, "close failed.");
  }
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  jerry_value_t jconstructor = jerry_create_external_function(ZMQ);
  iotjs_jval_set_property_jval(exports, "ZmqSocket", jconstructor);

  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "connect", Connect);
  iotjs_jval_set_method(proto, "subscribe", Subscribe);
  iotjs_jval_set_method(proto, "bindSync", BindSync);
  iotjs_jval_set_method(proto, "unbindSync", UnbindSync);
  iotjs_jval_set_method(proto, "recv", Recv);
  iotjs_jval_set_method(proto, "send", Send);
  iotjs_jval_set_method(proto, "close", Close);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(zmq, init)
