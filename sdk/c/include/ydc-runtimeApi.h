#ifndef YDC_RUNTIMEAPI_H
#define YDC_RUNTIMEAPI_H

#include <flora-agent.h>
#include <rklog/RKLog.h>
#include <ydc-APIName.h>
#ifdef __cplusplus
extern "C" {
#endif

#define API_DEFAULT_TIMEOUT 5000

struct ydc_api *getAPIHd(APINAME api);
int checkAPIValid(APINAME api);

void getCurrentFocus();
#ifdef __cplusplus
}
#endif
#endif