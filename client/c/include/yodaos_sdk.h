/**
* @file  yodaos_sdk.h  
* @brief Yodaos c client main functions.
*/
#ifndef YODAOS_SDK_H
#define YODAOS_SDK_H

#include <stdint.h>
#include <flora-agent.h>
#include "yodaos_api_defines.h"

#ifdef __cplusplus
extern "C" {
#endif

/* the callback from runtime event, msgType: event, fatal-error, internal; msg: the msg from remote.*/
typedef void (*yodaos_harbor_cb)(const char *from, const char *msgType,const char *msg);

/**
 * @brief Init c client sdk.
 * @param block 1, block. 
 *              0, no block.
 * @return 0 success other fail
 * @warning The function must be called on app starting firstly.
 */
YODAOS_API_PUBLIC int yodaos_api_init(uint8_t block);

/**
 * @brief Call runtime api and get result.
 * @param api the name of api called. 
 * @param params the args to be send to runtime,params can be null.
 * @param timeout the timeout called, unit millisecond.
 * @return the result received from flora.
 * @warning The function will block and wait for response or timeout. the result must be free 
 */
YODAOS_API_PUBLIC flora_call_result *yodaos_api_call(YODAOS_APINAME api, char *params, uint32_t timeout);

/**
 * @brief Call runtime api and ignore result.
 * @param api the name of api called. 
 * @param params the args to be send to runtime,params can be null.
 * @return 0 success other fail
 * @warning The function will block and wait for response or timeout.
 */
YODAOS_API_PUBLIC int32_t yodaos_api_call_ignoreresult(YODAOS_APINAME api, char *params);

/**
 * @brief Call runtime api and ignore result.
 * @param api the name of api called. 
 * @param params the args to be send to runtime,params can be null.
 * @return 0 success other fail
 */
YODAOS_API_PUBLIC char *yodaos_api_get_result(flora_call_result *result);

/**
 * @brief Free the result from api call.
 * @param result the result from api call returned.
 */
YODAOS_API_PUBLIC void yodaos_api_free_result(flora_call_result *result);

/**
 * @brief Subscribe the event.
 * @param evName the name of event. 
 * @param params the args to be send and can be null.
 * @param timeout unit millisecond.
 * @return 0 success other fail
 */
YODAOS_API_PUBLIC int32_t yodaos_ev_subscribe(YODAOS_EVNAME evName, char *params, uint32_t timeout);

/**
 * @brief The callback from harbor: event, fatal-error, internal.
 * @param cb callback. 
 */
YODAOS_API_PUBLIC void yodaos_api_registe_eventcb(yodaos_harbor_cb cb);

#ifdef __cplusplus
}
#endif

#endif /* YODAOS_SDK_H */
