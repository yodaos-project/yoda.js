/**
* @file  yodaos_sdk.c  
* @brief Client base functions implement here.
*/
#include <stdlib.h>
#include <stdint.h>
#include <unistd.h>
#include <pthread.h>
#include <flora-agent.h>
#include <yodaos_inner.h>
#include <json-c/json_util.h>

#define PING_TIMEOUT (5000)
//ping main thread
static pthread_t mainThreadId;

static void timeoutCb() {
    RKLogw("Begin to ping active From pid(%lu)\n", pthread_self());
    yodaos_send_runtime_active();
}

static void run(uint8_t block) {
    if (block) {
        while(1) {
            timeoutCb();
            usleep(PING_TIMEOUT * 1000UL);
        }
    } else {
        pthread_create(&mainThreadId, NULL, (void *)run, (void *)1);
    }
}

YODAOS_API_PUBLIC int yodaos_api_init(uint8_t block) {
    RKLogv("Begin to yodaos c sdk!!!pid:%d\n", getpid());
    const char *moduleName;
    struct json_object *json_module_name;

    struct json_object *json = json_object_from_file("./package.json");
    if(!!!json || !json_object_object_get_ex(json, "name", &json_module_name)) {
        RKLoge("Can not read json file or lost key:name!\n");
        exit(1);
    }

    moduleName = json_object_get_string(json_module_name);

    RKLogd("Get module name:%s\n", moduleName);

    //begin to init flora
    yodaos_init_flora(moduleName);
    yodaos_send_runtime_ready();

    //clear
    json_object_put(json);

    run(block);

    return 0;
}

void yodaos_block() {
    pthread_join(mainThreadId, NULL);
}