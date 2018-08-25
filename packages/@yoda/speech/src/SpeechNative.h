#ifndef SPEECH_NATIVE_H
#define SPEECH_NATIVE_H

#include <stdio.h>

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>
#include <uv.h>
#include <speech/speech.h>

using namespace std;
using namespace rokid::speech;

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  shared_ptr<Speech> speech;
  bool prepared;
  pthread_t polling;
} IOTJS_VALIDATED_STRUCT(iotjs_speech_t);

static iotjs_speech_t* iotjs_speech_create(const jerry_value_t jspeech);
static void iotjs_speech_destroy(iotjs_speech_t* speech);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // SPEECH_NATIVE_H
