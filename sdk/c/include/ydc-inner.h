#ifndef YDC_INNER_H
#define YDC_INNER_H

#include <flora-agent.h>
#include <rklog/RKLog.h>
#include "./ydc-APIBase.h"

#ifdef __cplusplus
extern "C" {
#endif

//flora msgs
void _flora_method_call_harbor(const char *name, caps_t msg,flora_call_reply_t reply, void *arg);
void SendRuntimeReady();
void SendRuntimeActive();

void InitFlora(char *moduleName);

#ifdef __cplusplus
}
#endif
#endif