/**
 * @file  flora.c
 * @brief Client communication functions implement here.
 */
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <unistd.h>
#include <pthread.h>
#include <flora-agent.h>
#include <yodaos_sdk.h>
#include <yodaos_api_container.h>
#include <yodaos_inner.h>

static flora_agent_t agent;
static pthread_mutex_t flora_lock;
static pthread_mutex_t event_lock;
static yodaos_harbor_cb _harbor_cb = NULL;

#define API_NULL_ARG "[]"

YODAOS_API_LOCAL void yodaos_local_event_lock(int lock) {
  if (lock)
    pthread_mutex_lock(&event_lock);
  else
    pthread_mutex_unlock(&event_lock);
}

YODAOS_API_PUBLIC void yodaos_api_registe_eventcb(yodaos_harbor_cb cb) {
  _harbor_cb = cb;
}
static void _flora_method_call_harbor(const char* name, caps_t msg,
                                      flora_call_reply_t reply, void* arg) {
  const char* type = NULL;
  const char* desc = NULL;

  caps_read_string(msg, &type);
  caps_read_string(msg, &desc);
  RKLogd("recv(%s) harbor:(%s) (%s)\n", name, type, desc);

  flora_call_reply_write_code(reply, 0);
  flora_call_reply_end(reply);

  yodaos_local_event_lock(1);
  if (_harbor_cb && type && desc) {
    _harbor_cb(name, (const char*)type, (const char*)desc);
  }
  yodaos_local_event_lock(0);
  usleep(100);
}

YODAOS_API_LOCAL void yodaos_init_flora(const char* moduleName) {
  static char socketPath[50] = { 0 };
  sprintf(socketPath, "unix:/var/run/flora.sock#%s:%d", moduleName, getpid());

  RKLogv("Socket path:%s\n", socketPath);

  pthread_mutex_init(&flora_lock, NULL);
  pthread_mutex_init(&event_lock, NULL);

  agent = flora_agent_create();

  flora_agent_config(agent, FLORA_AGENT_CONFIG_URI, socketPath);
  flora_agent_config(agent, FLORA_AGENT_CONFIG_BUFSIZE, 80 * 1024);
  flora_agent_config(agent, FLORA_AGENT_CONFIG_RECONN_INTERVAL, 5000);

  flora_agent_declare_method(agent, "yodaos.fauna.harbor",
                             _flora_method_call_harbor, (void*)NULL);
  flora_agent_start(agent, 0);
  yodaos_ev_subscribe(YODAOSAPI_NS_GLOBAL_EV_CREATED, NULL, 5000);
}

YODAOS_API_LOCAL int yodaos_check_api_valid(YODAOS_APINAME api) {
  int size = sizeof(api_container) / sizeof(struct yodaos_api_s);
  int ret = (int)api < size ? 1 : 0;

  return ret;
}

YODAOS_API_LOCAL struct yodaos_api_s* yodaos_get_apihd(YODAOS_APINAME api) {
  if (!yodaos_check_api_valid(api)) {
    return NULL;
  }

  if (api_container[api].name == api) {
    return &api_container[api];
  }

  for (int i = 0; i < sizeof(api_container) / sizeof(struct yodaos_api_s);
       i++) {
    if (api_container[i].name == api) {
      return &api_container[i];
    }
  }

  return NULL;
}

YODAOS_API_LOCAL struct yodaos_ev_s* yodaos_get_evhd(YODAOS_EVNAME ev) {
  int s = sizeof(ev_container) / sizeof(struct yodaos_ev_s);
  if (ev >= s) {
    return NULL;
  }

  if (ev_container[ev].name == ev) {
    return &ev_container[ev];
  }

  for (int i = 0; i < s; i++) {
    if (ev_container[i].name == ev) {
      return &ev_container[i];
    }
  }

  return NULL;
}

YODAOS_API_PUBLIC void yodaos_api_free_result(flora_call_result* result) {
  if (!result) {
    return;
  }

  if (result->data)
    caps_destroy(result->data);

  free(result);
}

YODAOS_API_PUBLIC char* yodaos_api_get_result(flora_call_result* result) {
  if (!result)
    return NULL;

  char* buf = NULL;

  caps_read_string(result->data, (const char**)&buf);

  return buf;
}
YODAOS_API_PUBLIC int32_t yodaos_api_call_ignoreresult(YODAOS_APINAME api,
                                                       char* params) {
  int32_t ret = 0;
  flora_call_result* data =
      yodaos_api_call(api, params, YODAOS_API_DEFAULT_TIMEOUT);

  if (!data) {
    return ret;
  } else {
    ret = data->ret_code;
    yodaos_api_free_result(data);
    return ret;
  }
}

YODAOS_API_PUBLIC flora_call_result* yodaos_api_call(YODAOS_APINAME api,
                                                     char* params,
                                                     uint32_t timeout) {
  struct yodaos_api_s* apiHd = yodaos_get_apihd(api);
  char* toset = params;

  if (!toset)
    toset = API_NULL_ARG;

  if (!apiHd) {
    RKLoge("API ERROR!\n");
    return NULL;
  }

  char* nameSpace = apiHd->nameSpace;
  char* method = apiHd->methodName;
  char args[60 + strlen(method) + strlen(toset)];

  flora_call_result* result = calloc(1, sizeof(flora_call_result));
  caps_t cmsg = caps_create();

  sprintf(args, "{\"namespace\":\"%s\", \"method\":\"%s\", \"params\":%s}",
          nameSpace, method, toset);
  caps_write_string(cmsg, args);

  RKLogv("Send cmd:%s\n", args);
  pthread_mutex_lock(&flora_lock);
  flora_agent_call(agent, "yodaos.fauna.invoke", cmsg, "runtime", result,
                   timeout);
  pthread_mutex_unlock(&flora_lock);

  caps_destroy(cmsg);

  RKLogv("Get cb, code=%d\n", result->ret_code);

  return result;
}

YODAOS_API_PUBLIC int32_t yodaos_ev_subscribe(YODAOS_EVNAME evName,
                                              char* params, uint32_t timeout) {
  int32_t ret;
  char* toset = API_NULL_ARG;
  struct yodaos_ev_s* ev = yodaos_get_evhd(evName);
  if (!ev) {
    RKLoge("Can not get ev hd:%d\n", evName);
    return 1;
  }

  if (params) {
    toset = params;
  }

  caps_t cmsg = caps_create();
  flora_call_result result = { 0 };

  char args[60 + strlen(ev->nameSpace) + strlen(ev->evName)];
  sprintf(args, "{\"namespace\":\"%s\", \"event\":\"%s\", \"params\":%s}",
          ev->nameSpace, ev->evName, toset);
  caps_write_string(cmsg, (const char*)args);

  RKLogv("Subscribe cmd：%s\n", args);

  pthread_mutex_lock(&flora_lock);
  flora_agent_call(agent, "yodaos.fauna.subscribe", cmsg, "runtime", &result,
                   timeout);
  pthread_mutex_unlock(&flora_lock);
  ret = result.ret_code;
  RKLogd("Subscribe Get retCode:%d, %s\n", result.ret_code,
         yodaos_api_get_result(&result));

  caps_destroy(result.data);
  caps_destroy(cmsg);

  return ret;
}

static int32_t send_runtime_msg(const char* msg, flora_call_callback_t cb) {
  int32_t ret;

  caps_t cmsg = caps_create();
  caps_write_string(cmsg, msg);
  pthread_mutex_lock(&flora_lock);

  ret = flora_agent_call_nb(agent, "yodaos.fauna.status-report", cmsg,
                            "runtime", cb, NULL, 5000);

  pthread_mutex_unlock(&flora_lock);
  caps_destroy(cmsg);

  return ret;
}

static void flora_send_null_cb(int32_t rescode, flora_call_result* result,
                               void* arg) {
  // donothing
}

YODAOS_API_LOCAL void yodaos_send_runtime_ready() {
  send_runtime_msg("ready", flora_send_null_cb);
}

YODAOS_API_LOCAL void yodaos_send_runtime_active() {
  send_runtime_msg("alive", flora_send_null_cb);
}

YODAOS_API_PUBLIC int32_t yodaos_flora_post(const char* name, caps_t msg,
                                            uint32_t msgtype) {
  int32_t ret;

  pthread_mutex_lock(&flora_lock);
  ret = flora_agent_post(agent, name, msg, msgtype);
  pthread_mutex_unlock(&flora_lock);

  return ret;
}