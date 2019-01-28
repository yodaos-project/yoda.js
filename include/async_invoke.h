#ifndef YODA_ASYNC_INVOKE_H_
#define YODA_ASYNC_INVOKE_H_

#include <stdlib.h>
#include <functional>
#include <uv.h>
#include "common.h"

static uv_thread_t main_thread;
typedef napi_value (*ParamInitFn)(napi_env);

struct yoda_async_info_s {
  napi_env env;
  napi_ref ref;
  std::function<napi_value(napi_env)>* init_fn;
  uv_mutex_t mutex;
  uv_sem_t sem;
};
typedef yoda_async_info_s yoda_async_info_t;

static uv_async_t* yoda_async_init(napi_env, napi_value);
static void yoda_async_invoke(uv_async_t*, std::function<napi_value(napi_env)>);
static void yoda_do_invoke(yoda_async_info_t*);
static void yoda_async_cb(uv_async_t*);
static void yoda_async_close_cb(uv_handle_t*);
static void yoda_async_destroy(uv_async_t*);

/**
 * Initialize an async handle.
 * @method yoda_async_init
 */
uv_async_t* yoda_async_init(napi_env env, napi_value fn) {
  main_thread = uv_thread_self();

  uv_loop_t* loop;
  NAPI_CALL(env, napi_get_uv_event_loop(env, &loop));

  uv_async_t* async = (uv_async_t *)malloc(sizeof(uv_async_t));
  yoda_async_info_t* async_info = (yoda_async_info_t*)malloc(sizeof(yoda_async_info_t));
  async_info->env = env;
  NAPI_CALL(env, napi_create_reference(env, fn, 1, &async_info->ref));

  uv_mutex_init(&async_info->mutex);
  uv_sem_init(&async_info->sem, 0);
  async->data = async_info;
  uv_async_init(loop, async, yoda_async_cb);
  return async;
}

/**
 * Invokes the async with callback.
 * @method yoda_async_init
 */
static void yoda_async_invoke(uv_async_t* handle, std::function<napi_value(napi_env)> init_fn) {
  yoda_async_info_t* async_info = (yoda_async_info_t*)handle->data;
  uv_mutex_lock(&async_info->mutex);

  async_info->init_fn = &init_fn;
  uv_thread_t this_thread = uv_thread_self();
  if (uv_thread_equal(&this_thread, &main_thread)) {
    yoda_do_invoke(async_info);
  } else {
    uv_async_send(handle);
    uv_sem_wait(&async_info->sem);
  }
  uv_mutex_unlock(&async_info->mutex);
}

/**
 * Invokes the async without callback.
 * @method yoda_async_init
 * @private
 */
static void yoda_do_invoke(yoda_async_info_t* async_info) {
  napi_env env = async_info->env;
  napi_ref ref = async_info->ref;
  std::function<napi_value(napi_env)>const& init_fn = *(async_info->init_fn);

  napi_handle_scope handle_scope;
  NAPI_CALL_RETURN_VOID(env, napi_open_handle_scope(env, &handle_scope));

  napi_value nval_undefined;
  NAPI_CALL_RETURN_VOID(env, napi_get_undefined(env, &nval_undefined));

  napi_value nval_fn;
  NAPI_CALL_RETURN_VOID(env, napi_get_reference_value(env, ref, &nval_fn));

  napi_value args[1];
  args[0] = init_fn(env);

  uv_sem_post(&async_info->sem);
  NAPI_CALL_RETURN_VOID(env, napi_call_function(env, nval_undefined, nval_fn, 1, args, nullptr));
  NAPI_CALL_RETURN_VOID(env, napi_close_handle_scope(env, handle_scope));
}

/**
 * Invokes the async without callback.
 * @method yoda_async_cb
 * @private
 */
static void yoda_async_cb(uv_async_t* handle) {
  yoda_async_info_t* async_info = (yoda_async_info_t*)handle->data;
  yoda_do_invoke(async_info);
}

/**
 * The close callback for async handle.
 * @method yoda_async_close_cb
 * @private
 */
static void yoda_async_close_cb(uv_handle_t* handle) {
  yoda_async_info_t* async_info = (yoda_async_info_t*)handle->data;
  napi_env env = async_info->env;
  napi_ref ref = async_info->ref;
  napi_delete_reference(env, ref);

  uv_mutex_destroy(&async_info->mutex);
  uv_sem_destroy(&async_info->sem);
  free(async_info);
}

/**
 * Destroy the async handle.
 * @method yoda_async_destroy
 * @private
 */
void yoda_async_destroy(uv_async_t* handle) {
  uv_close((uv_handle_t*)handle, yoda_async_close_cb);
}

#endif
