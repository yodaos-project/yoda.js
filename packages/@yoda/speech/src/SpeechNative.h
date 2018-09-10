#ifndef SPEECH_NATIVE_H
#define SPEECH_NATIVE_H

#include <stdio.h>
#include <speech/speech.h>

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>
#include <uv.h>

using namespace std;
using namespace rokid::speech;

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  shared_ptr<Speech> speech;
  pthread_t polling;
  uv_async_t async;
  bool prepared;
  bool has_error;
  char* nlp;
  char* action;
  char* stack;
  char* skillOption;
} IOTJS_VALIDATED_STRUCT(iotjs_speech_t);

static iotjs_speech_t* iotjs_speech_create(const jerry_value_t jspeech);
static void iotjs_speech_destroy(iotjs_speech_t* speech);
static void iotjs_speech_onresult(uv_async_t* handle);
static void* iotjs_speech_poll_event(void* data);
static void iotjs_speech_send_event(iotjs_speech_t* speech, SpeechResult result, bool has_error);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // SPEECH_NATIVE_H
