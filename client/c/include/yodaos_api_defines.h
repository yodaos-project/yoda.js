/**
 * @file  yodaos_api_defines.h
 * @brief The base struct and macro.
 */
#ifndef YODAOS_API_DEFINES_H
#define YODAOS_API_DEFINES_H

#include <stdio.h>
#include "yodaos_apis.h"
#ifdef USING_RKLOG
#include <rklog/RKLog.h>
#else
#define RKLogv(...) printf(__VA_ARGS__)
#define RKLogd(...) printf(__VA_ARGS__)
#define RKLogi(...) printf(__VA_ARGS__)
#define RKLogw(...) printf(__VA_ARGS__)
#define RKLoge(...) printf(__VA_ARGS__)
#endif

#if __GNUC__ >= 4 // it means the compiler is GCC version 4.0 or later
#ifdef YODAOS_API_EXPORT
//#warning "===== dynamic library ====="
#define YODAOS_API_PUBLIC __attribute__((visibility("default")))
#define YODAOS_API_LOCAL __attribute__((visibility("hidden")))
#else
//#warning "===== static library ====="
#define YODAOS_API_PUBLIC
#define YODAOS_API_LOCAL
#endif
#else
#error "##### requires gcc version >= 4.0 #####"
#endif

/**
 * @brief the struct of api, used for store every runtime method.
 */
typedef struct yodaos_api_s {
  YODAOS_APINAME name;
  char* nameSpace;
  char* methodName;
} yodaos_api_t;

/**
 * @brief the struct of event, used for store every runtime event.
 */
typedef struct yodaos_ev_s {
  YODAOS_EVNAME name;
  char* nameSpace;
  char* evName;
} yodaos_event_t;

/// the calling api default timeout
#define YODAOS_API_DEFAULT_TIMEOUT 5000

#endif
