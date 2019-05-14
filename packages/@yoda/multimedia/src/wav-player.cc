#include <stdlib.h>
#include <stdio.h>
#include <node_api.h>
#include <common.h>
#include <string.h>
#include <librplayer/WavPlayer.h>

typedef struct {
  char** _filenames;
  int _filenum;
  int _result;
  napi_ref _callback;
  napi_async_work _request;
} init_carrier;

typedef struct {
  int _result;
  napi_ref _callback;
  napi_async_work _request;
} start_carrier;

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
  if (c) {
    c->_result =
        prePrepareWavPlayer((const char**)(c->_filenames), c->_filenum);
  } else {
    return;
  }

  for (size_t i = 0; i < c->_filenum; i++) {
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

  if (!c || status != napi_ok) {
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

  delete c;
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
  the_carrier->_filenum = length;

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
  NAPI_CALL(env, napi_queue_async_work(env, the_carrier->_request));
  return NULL;
}

static void DoPreparePlayer(napi_env env, void* data) {
  prepare_carrier* c = static_cast<prepare_carrier*>(data);
  if (c) {
    c->_result = prepareWavPlayer(c->_filename, c->_tag, c->_holdconnect);
  } else {
    return;
  }
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

  if (!c || status != napi_ok) {
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

  delete c;
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

static void DoStartPlayer(napi_env env, void* data) {
  start_carrier* c = static_cast<start_carrier*>(data);
  if (!c) {
    return;
  }
  c->_result = startWavPlayer();
  return;
}

static void AfterStartPlayer(napi_env env, napi_status status, void* data) {
  start_carrier* c = static_cast<start_carrier*>(data);
  if (!c || status != napi_ok) {
    napi_throw_type_error(env, nullptr, "Execute callback failed.");
    return;
  }
  napi_value argv[1];
  if (c->_result == -1) {
    napi_value message;
    NAPI_CALL_RETURN_VOID(env,
                          napi_create_string_utf8(env, "Start WavPlayer Error",
                                                  NAPI_AUTO_LENGTH, &message));
    NAPI_CALL_RETURN_VOID(env,
                          napi_create_error(env, message, message, &argv[0]));
    printf("on AfterStartPlayer created error\n");
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

  delete c;
}

static napi_value Start(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
  if (argc != 1) {
    napi_throw_error(env, nullptr, "The argument number is wrong.");
    return NULL;
  }

  start_carrier* the_carrier = new start_carrier;

  napi_value resource_name;
  NAPI_CALL(env, napi_create_string_utf8(env, "startPlayer", NAPI_AUTO_LENGTH,
                                         &resource_name));
  NAPI_CALL(env,
            napi_create_reference(env, argv[0], 1, &(the_carrier->_callback)));
  NAPI_CALL(env, napi_create_async_work(env, argv[0], resource_name,
                                        DoStartPlayer, AfterStartPlayer,
                                        the_carrier, &(the_carrier->_request)));
  NAPI_CALL(env, napi_queue_async_work(env, the_carrier->_request));

  return NULL;
}

static napi_value Stop(napi_env env, napi_callback_info info) {
  stopWavPlayer();
  return NULL;
}

/** cppcheck-suppress unusedFunction */
static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    DECLARE_NAPI_PROPERTY("initPlayer", InitPlayer),
    DECLARE_NAPI_PROPERTY("prepare", Prepare),
    DECLARE_NAPI_PROPERTY("start", Start), DECLARE_NAPI_PROPERTY("stop", Stop)
  };

  NAPI_CALL(env, napi_define_properties(env, exports,
                                        sizeof(desc) / sizeof(*desc), desc));

  return exports;
}

NAPI_MODULE(WavPlayer, Init)
