/**
 * @file  yodaos_inner.h
 * @brief The file just used in sdk, not export.
 */
#ifndef YODAOS_INNER_H
#define YODAOS_INNER_H

#include <flora-agent.h>
#include "./yodaos_api_defines.h"

#ifdef __cplusplus
extern "C" {
#endif

YODAOS_API_LOCAL void yodaos_send_runtime_ready();
YODAOS_API_LOCAL void yodaos_send_runtime_active();

YODAOS_API_LOCAL void yodaos_init_flora(const char* moduleName);
YODAOS_API_LOCAL char* yodaos_read_json_file(char* filepath);

YODAOS_API_LOCAL struct yodaos_api_s* yodaos_get_apihd(YODAOS_APINAME api);
YODAOS_API_LOCAL int yodaos_check_api_valid(YODAOS_APINAME api);

#ifdef __cplusplus
}
#endif
#endif