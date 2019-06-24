/**************************************************************
 * Copyright (c) 2018-2020,Hangzhou Rokid Tech. Co., Ltd.
 * All rights reserved.
 *
 * FileName: flora.c
 * Description: Dynamic library interface
 *
 * Date  :	2019.06.18
 * Author:  zijiao.wang@rokid.com
 * Modification: Init version
 *
 **************************************************************/

#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <unistd.h>
#include <uv.h>
#include <pthread.h>
#include <cjson/cJSON.h>
#include <flora-agent.h>
#include <ydc-inner.h>
#include <ydc-runtimeApi.h>
#include <ydc-APIContainer.h>
#include <ydc-sdk.h>

static flora_agent_t agent;
static uv_mutex_t flora_lock;

#define API_NULL_ARG "[]"

void InitFlora(char *moduleName) {
    static char socketPath[50] = {0};
    //todo get app name from manifest
    sprintf(socketPath, "unix:/var/run/flora.sock#%s:%d", moduleName, getpid());

    RKLogv("Socket path:%s\n", socketPath);

    uv_mutex_init(&flora_lock);

    agent = flora_agent_create();

    flora_agent_config(agent, FLORA_AGENT_CONFIG_URI, socketPath);
    flora_agent_config(agent, FLORA_AGENT_CONFIG_BUFSIZE, 80 * 1024);
    flora_agent_config(agent, FLORA_AGENT_CONFIG_RECONN_INTERVAL, 5000);

    flora_agent_declare_method(agent, "yodaos.fauna.harbor",
                                    _flora_method_call_harbor, (void *)NULL);
    flora_agent_start(agent, 0);
}

int checkAPIValid(APINAME api) {
    int size = sizeof(api_container)/sizeof(struct ydc_api);
    int ret = (int)api < size?1:0;

    return ret;
}

struct ydc_api *getAPIHd(APINAME api) {
    if(!checkAPIValid(api)) {
        return NULL;
    }

    if(api_container[api].name == api) {
        return &api_container[api];
    }

    for (int i = 0; i < sizeof(api_container)/sizeof(struct ydc_api); i++) {
        if (api_container[i].name == api) {
            return &api_container[i];
        }
    }

    return NULL;
}

void freeAPIResult(flora_call_result *result) {
    if (!result) {
        return;
    }

    if(result->data)
        caps_destroy(result->data);

    free(result);
}

char *getAPIResult(flora_call_result *result) {
    if(!result)
        return NULL;

    char *buf = NULL;

    caps_read_string(result->data, (const char **)&buf);

    return buf;
}
int32_t CallAPIWithoutResult(APINAME api, char *params) {
    int32_t ret = 0;
    flora_call_result *data = CallAPI(api, params, API_DEFAULT_TIMEOUT);

    if(!data) {
        return ret;
    } else {
        ret = data->ret_code;
        freeAPIResult(data);
        return ret;
    }
}

flora_call_result *CallAPI(APINAME api, char *params, uint32_t timeout) {
    struct ydc_api *apiHd = getAPIHd(api);
    char *toset = params;
    
    if(!toset)
        toset = API_NULL_ARG;

    if (!apiHd) {
        RKLoge("API ERROR!\n");
        return NULL;
    }

    char *nameSpace = apiHd->nameSpace;
    char *method = apiHd->methodName;
    char args[60+strlen(method)+strlen(toset)];

    flora_call_result *result = malloc(sizeof(flora_call_result));
    caps_t cmsg = caps_create();

    sprintf(args, "{\"namespace\":\"%s\", \"method\":\"%s\", \"params\":%s}", nameSpace, method, toset);
    caps_write_string(cmsg, args);

    RKLogv("Send cmd:%s\n", args);
    uv_mutex_lock(&flora_lock);
    flora_agent_call(agent, "yodaos.fauna.invoke", cmsg, "runtime", result, timeout);
    uv_mutex_unlock(&flora_lock);

    caps_destroy(cmsg);

    RKLogv("Get cb, code=%d\n", result->ret_code);

    return result;
}

int32_t SendRuntimeMsg(const char *msg, flora_call_callback_t cb) {
    int32_t ret;

    caps_t cmsg = caps_create();
    caps_write_string(cmsg, msg);
    uv_mutex_lock(&flora_lock);

    ret = flora_agent_call_nb(agent, "yodaos.fauna.status-report", cmsg, "runtime", cb, NULL, 5000);

    uv_mutex_unlock(&flora_lock);
    caps_destroy(cmsg);

    return ret;
}

static void flora_send_null_cb(int32_t rescode,
                                      flora_call_result *result, void *arg) {
    char *buf = NULL;
    caps_read_string(result->data, (const char **)&buf);
    RKLogv("ret code:%d, ret string:%s\n", result->ret_code, buf);
}

void SendRuntimeReady() {
    SendRuntimeMsg("ready", flora_send_null_cb);
}

void SendRuntimeActive() {
    SendRuntimeMsg("active", flora_send_null_cb);
}

int32_t YdcFloraPost(const char *name, caps_t msg, uint32_t msgtype) {
    int32_t ret;

    uv_mutex_lock(&flora_lock);
    ret = flora_agent_post(agent, name, msg, msgtype);
    uv_mutex_unlock(&flora_lock);

    return ret;
}