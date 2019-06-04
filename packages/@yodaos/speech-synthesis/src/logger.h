#pragma once

#if defined(RKLOG_PRESENT)
#include "rklog/RKLog.h"
#else

#define RKLog_VA(out, msg, ...) \
  fprintf(out, "%s: " msg "\n", LOG_TAG, ##__VA_ARGS__)

#define RKLogv(...) RKLog_VA(stdout, __VA_ARGS__)

#define RKLogw(...) RKLog_VA(stderr, __VA_ARGS__)

#endif // defined(RKLOG_PRESENT)
