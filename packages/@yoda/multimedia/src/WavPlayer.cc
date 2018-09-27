#include <stdlib.h>
#include <stdio.h>
#include <node_api.h>
#include <common.h>
#include <string.h>
#include <wavPlayer.h>

typedef struct {
  char** _filenames;
  int _filesize;
  int _result;
  napi_ref _callback;
  napi_async_work _request;
} init_carrier;

typedef struct {
  char* _filename;
  char* _tag;
  bool _holdconnect;
  int _result;
  napi_ref _callback;
  napi_async_work _request;
} prepare_carrier;

static void DoInitPlayer(napi_env env, void* data) {
  init_carrier* c = static_cast<init_carrier*>(data);

  c->_result = prePrepareWavPlayer((const char**)(c->_filenames), c->_filesize);

  for (size_t i = 0; i < c->_filesize; i++) {
    if (c->_filenames[i] != NULL) {
      free(c->_filenames[i]);
      c->_filenames[i] = NULL;
    }
  }
  if (c->_filenames != NULL) {
    free(c->_filenames);
    c->_filenames = NULL;
  }
}

static void AfterInitPlayer(napi_env env, napi_status status, void* data) {
  init_carrier* c = static_cast<init_carrier*>(data);

  if (status != napi_ok) {
    napi_throw_type_error(env, nullptr, "Execute callback failed.");
    return;
  }

  napi_value argv[1];
  if (c->_result == -1) {
    napi_value message;
    NAPI_CALL_RETURN_VOID(env,
                          napi_create_string_utf8(env, "Init WavPlayer Error",
                                                  NAPI_AUTO_LENGTH, &message));
    NAPI_CALL_RETURN_VOID(env, napi_create_error(env, NULL, message, &argv[0]));
  } else {
    NAPI_CALL_RETURN_VOID(env, napi_get_null(env, &argv[0]));
  }

  napi_value callback;
  NAPI_CALL_RETURN_VOID(env,
                        napi_get_reference_value(env, c->_callback, &callback));
  napi_value global;
  NAPI_CALL_RETURN_VOID(env, napi_get_global(env, &global));

  napi_value result;
  NAPI_CALL_RETURN_VOID(env, napi_call_function(env, global, callback, 1, argv,
                                                &result));

  NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, c->_callback));
  NAPI_CALL_RETURN_VOID(env, napi_delete_async_work(env, c->_request));

  if (c)
    free(c);
}

static napi_value InitPlayer(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  napi_value nval_filenames = argv[0];
  bool is_array;
  NAPI_CALL(env, napi_is_array(env, nval_filenames, &is_array));
  if (!is_array) {
    napi_throw_type_error(env, nullptr, "The first argument must be an array.");
    return NULL;
  }

  init_carrier* the_carrier = new init_carrier;
  uint32_t length;
  NAPI_CALL(env, napi_get_array_length(env, nval_filenames, &length));

  size_t filesize = sizeof(char*) * length;
  char** filenames = (char**)malloc(filesize);
  memset(filenames, 0, filesize);
  the_carrier->_filenames = filenames;
  the_carrier->_filesize = filesize;

  for (int i = 0; i < length; i++) {
    napi_value nval_filename;
    NAPI_CALL(env, napi_get_element(env, nval_filenames, i, &nval_filename));

    size_t size = 0;
    NAPI_CALL(env,
              napi_get_value_string_utf8(env, nval_filename, NULL, 0, &size));
    char* filename = (char*)malloc(size + 1);
    NAPI_CALL(env, napi_get_value_string_utf8(env, nval_filename, filename,
                                              size + 1, &size));
    filename[size] = 0;
    filenames[i] = filename;
  }

  napi_value resource_name;
  NAPI_CALL(env, napi_create_string_utf8(env, "initPlayer", NAPI_AUTO_LENGTH,
                                         &resource_name));
  NAPI_CALL(env,
            napi_create_reference(env, argv[1], 1, &(the_carrier->_callback)));
  NAPI_CALL(env, napi_create_async_work(env, argv[1], resource_name,
                                        DoInitPlayer, AfterInitPlayer,
                                        the_carrier, &(the_carrier->_request)));
  return NULL;
}

static void DoPreparePlayer(napi_env env, void* data) {
  prepare_carrier* c = static_cast<prepare_carrier*>(data);
  c->_result = prepareWavPlayer(c->_filename, c->_tag, c->_holdconnect);

  if (c->_filename != NULL) {
    free(c->_filename);
    c->_filename = NULL;
  }
  if (c->_tag != NULL) {
    free(c->_tag);
    c->_tag = NULL;
  }
}

static void AfterPreparePlayer(napi_env env, napi_status status, void* data) {
  prepare_carrier* c = static_cast<prepare_carrier*>(data);

  if (status != napi_ok) {
    napi_throw_type_error(env, nullptr, "Execute callback failed.");
    return;
  }

  napi_value argv[1];
  if (c->_result == -1) {
    napi_value message;
    NAPI_CALL_RETURN_VOID(env,
                          napi_create_string_utf8(env,
                                                  "Prepare WavPlayer Error",
                                                  NAPI_AUTO_LENGTH, &message));
    NAPI_CALL_RETURN_VOID(env, napi_create_error(env, NULL, message, &argv[0]));
  } else {
    NAPI_CALL_RETURN_VOID(env, napi_get_null(env, &argv[0]));
  }

  napi_value callback;
  NAPI_CALL_RETURN_VOID(env,
                        napi_get_reference_value(env, c->_callback, &callback));
  napi_value global;
  NAPI_CALL_RETURN_VOID(env, napi_get_global(env, &global));

  napi_value result;
  NAPI_CALL_RETURN_VOID(env, napi_call_function(env, global, callback, 1, argv,
                                                &result));

  NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, c->_callback));
  NAPI_CALL_RETURN_VOID(env, napi_delete_async_work(env, c->_request));

  if (c)
    free(c);
}

static napi_value Prepare(napi_env env, napi_callback_info info) {
  size_t argc = 4;
  napi_value argv[4];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  if (argc != 4) {
    napi_throw_error(env, nullptr, "The argument number is wrong.");
    return NULL;
  }

  size_t size = 0;
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[0], NULL, 0, &size));
  char* filename = (char*)malloc(size + 1);
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[0], filename, size + 1,
                                            &size));
  filename[size] = 0;

  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[1], NULL, 0, &size));
  char* tag = (char*)malloc(size + 1);
  NAPI_CALL(env,
            napi_get_value_string_utf8(env, argv[1], tag, size + 1, &size));
  tag[size] = 0;

  bool holdconnect = false;
  NAPI_CALL(env, napi_get_value_bool(env, argv[2], &holdconnect));

  prepare_carrier* the_carrier = new prepare_carrier;
  the_carrier->_filename = filename;
  the_carrier->_tag = tag;
  the_carrier->_holdconnect = holdconnect;

  napi_value resource_name;
  NAPI_CALL(env, napi_create_string_utf8(env, "preparePlayer", NAPI_AUTO_LENGTH,
                                         &resource_name));
  NAPI_CALL(env,
            napi_create_reference(env, argv[3], 1, &(the_carrier->_callback)));
  NAPI_CALL(env, napi_create_async_work(env, argv[3], resource_name,
                                        DoPreparePlayer, AfterPreparePlayer,
                                        the_carrier, &(the_carrier->_request)));
  NAPI_CALL(env, napi_queue_async_work(env, the_carrier->_request));

  return NULL;
}

static napi_value Start(napi_env env, napi_callback_info info) {
  startWavPlayer();
  return NULL;
}

static napi_value Stop(napi_env env, napi_callback_info info) {
  stopWavPlayer();
  return NULL;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = { DECLARE_NAPI_PROPERTY("initPlayer",
                                                            InitPlayer),
                                      DECLARE_NAPI_PROPERTY("prepare", Prepare),
                                      DECLARE_NAPI_PROPERTY("start", Start),
                                      DECLARE_NAPI_PROPERTY("stop", Stop) };

  NAPI_CALL(env, napi_define_properties(env, exports,
                                        sizeof(desc) / sizeof(*desc), desc));

  return exports;
}

NAPI_MODULE(WavPlayer, Init)
