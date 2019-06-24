#include <ydc-runtimeApi.h>
#include <ydc-inner.h>
#include <ydc-APIName.h>
#include <ydc-sdk.h>

void getCurrentFocus() {
    flora_call_result *ret =  CallAPI(API_NS_AUDIOFOCUS_MT_GETCURRENTFOCUSES, NULL, API_DEFAULT_TIMEOUT);

    RKLogw("Get rsp(new api)(%d):%s\n", ret->ret_code, getAPIResult(ret));

    freeAPIResult(ret);
}