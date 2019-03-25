#ifndef TTS_NATIVE_H
#define TTS_NATIVE_H

#include <stdio.h>
#include <stdlib.h>
#include <list>
#include "TtsService.h"

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>
#include <uv.h>

using namespace std;

class TtsNative;
typedef struct iotjs_tts_event_s iotjs_tts_event_t;

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  // cppcheck-suppress unusedStructMember
  bool prepared;
  // cppcheck-suppress unusedStructMember
  TtsNative* handle;
  uv_async_t event_handle;
  list<iotjs_tts_event_t*> events;
  uv_mutex_t event_mutex;
} IOTJS_VALIDATED_STRUCT(iotjs_tts_t);

struct iotjs_tts_event_s {
  // cppcheck-suppress unusedStructMember
  TtsResultType type;
  // cppcheck-suppress unusedStructMember
  int code;
  // cppcheck-suppress unusedStructMember
  int id;
};

/**
 * @class TtsNative
 * @extends TtsService
 */
class TtsNative : public TtsService {
 public:
  TtsNative(){};
  explicit TtsNative(iotjs_tts_t* ttswrap_) {
    ttswrap = ttswrap_;
    send_event = &TtsNative::SendEvent;
  };
  ~TtsNative(){};

 public:
  static void SendEvent(void* self, TtsResultType type, int id, int code);
  static void OnEvent(uv_async_t* handle);

 protected:
  iotjs_tts_t* ttswrap;
};

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // TTS_NATIVE_H
