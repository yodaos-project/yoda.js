#ifndef TTS_NATIVE_H
#define TTS_NATIVE_H

#include <stdlib.h>
#include <stdio.h>
#include "TtsService.h"

#ifdef __cplusplus
extern "C"
{
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>

/**
 * @class TtsNative
 */
class TtsNative : public TtsService {
 public:
  TtsNative() {};
  ~TtsNative() {};

  void sendEvent(TtsResultType event, int id, int code);
};

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  jerry_value_t jcallback;
  TtsNative* handle;
} IOTJS_VALIDATED_STRUCT(iotjs_tts_t);

static iotjs_tts_t* iotjs_tts_create(const jerry_value_t jtts);
static void iotjs_tts_destroy(iotjs_tts_t* tts);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // TTS_NATIVE_H
