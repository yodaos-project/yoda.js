#ifndef TTS_NATIVE_H
#define TTS_NATIVE_H

#include <stdlib.h>
#include <stdio.h>
#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include "TtsService.h"

/**
 * @class TtsNative
 */
class TtsNative : public TtsService {
 public:
  TtsNative();
  ~TtsNative();

  void sendEvent(TtsResultType event, int id, int code);
};

#endif // TTS_NATIVE_H
