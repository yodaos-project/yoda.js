#include <stdio.h>
#include <unistd.h>
#include <yodaos_sdk.h>
#include <yodaos_apis.h>
#include <stdbool.h>

int main() {
    yodaos_api_init(0);
    
    flora_call_result *ret =  yodaos_api_call(YODAOSAPI_NS_AUDIOFOCUS_MT_GETCURRENTFOCUSES, NULL, YODAOS_API_DEFAULT_TIMEOUT);

    RKLogw("Get rsp(new api)(%d):%s\n", ret->ret_code, yodaos_api_get_result(ret));
    yodaos_api_free_result(ret);

    yodaos_api_call_ignoreresult(YODAOSAPI_NS_AUDIOFOCUS_MT_GETCURRENTFOCUSES, NULL);

    yodaos_ev_subscribe(YODAOSAPI_NS_KEYBOARD_EV_KEYDOWN, NULL, 5000);

    pause();
    printf("Exit!!!\n");

    return 0;
}
