/**************************************************************
 * Copyright (c) 2018-2020,Hangzhou Rokid Tech. Co., Ltd.
 * All rights reserved.
 *
 * FileName: ydc-c.c
 * Description: Dynamic library interface
 *
 * Date  :	2019.06.18
 * Author:  zijiao.wang@rokid.com
 * Modification: Init version
 *
 **************************************************************/

#include <stdlib.h>
#include <stdint.h>
#include <unistd.h>
#include <uv.h>
#include <pthread.h>
#include <cjson/cJSON.h>
#include <flora-agent.h>
#include <ydc-inner.h>
#include <ydc-runtimeApi.h>

#define PING_TIMEOUT (5000)
//Uv main loop run thread!
static uv_thread_t mainThreadId;

static void _runloop(void *data){
    uv_loop_t *loop = (uv_loop_t *) data;
    if (!loop) {
        printf("loop is null, exit!\n");
    }

    uv_run(loop, UV_RUN_DEFAULT);
    uv_loop_close(loop);
    free(loop);
}

static void pingTimeoutCB(uv_timer_t *handle) {
    RKLogw("Timeout!!! %lu\n", pthread_self());
    SendRuntimeActive();

    //getCurrentFocus();
}

int YdcInit(void *lp, uint8_t block) {
    RKLogv("Jump to YdcInitAsync!!!pid:%d\n", getpid());
    char *moduleName;
    uv_loop_t *loop = uv_default_loop();

    if(NULL != lp) {
        loop = (uv_loop_t *)lp;
    } else {
        uv_loop_t *loop = malloc(sizeof(uv_loop_t));
        uv_loop_init(loop);
    }

    uv_timer_t *pingTimer = malloc(sizeof(uv_timer_t));
    uv_timer_init(loop, pingTimer);
    uv_timer_start(pingTimer, pingTimeoutCB, 0, PING_TIMEOUT);
    
    //begin to read manifest file
    char *jsonbuf = ReadJsonFile("./package.json");
    if (!jsonbuf) {
        RKLoge("Read json file error!");
        exit(1);
    }
    cJSON *json = cJSON_Parse(jsonbuf);
    if(!json) {
        RKLoge("Parse json file error[%s]!", cJSON_GetErrorPtr());
        exit(1);
    }
    cJSON *node = cJSON_GetObjectItem(json, "name");
    if (!!node && cJSON_IsString(node)) {
        moduleName = node->valuestring;
    } else {
        RKLoge("Can not get module name!");
        exit(1);
    }

    //begin to init flora
    InitFlora(moduleName);
    SendRuntimeReady();

    //clear
    free(jsonbuf);
    cJSON_Delete(json);

    if (block) {
        uv_run(loop, UV_RUN_DEFAULT);
    } else if(NULL == lp && !block) {
        uv_thread_create(&mainThreadId, _runloop, loop);
    }

    return 0;
}

void YdcBlock() {
    uv_thread_join(&mainThreadId);
}

void _flora_method_call_harbor(const char *name, caps_t msg,flora_call_reply_t reply, void *arg) {
    const char *buf = NULL;
    caps_read_string(msg, &buf);
    printf("recv harbor:%s\n", buf);
}