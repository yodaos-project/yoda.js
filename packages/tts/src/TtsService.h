#ifndef TTS_SERVICE_H
#define TTS_SERVICE_H

#include <stdlib.h>
#include <string>
#include <speech/tts.h>
#include "OpusPlayer.h"

using namespace std;
using namespace rokid;
using namespace speech;

enum TtsStatusCode {
  TTS_OK = 0,
  TTS_NOT_PREPARED,
  TTS_ERROR,
};

class TtsService {
 public:
  TtsService();
  ~TtsService();

  bool prepare(const char* host,
               int port,
               const char* branch,
               const char* auth_key,
               const char* device_type,
               const char* device_id,
               const char* secret,
               const char* declaimer);
  int speak(const char*);
  int cancel(int id);
  int disconnect();

  static void* PollEvent(void* params);

 protected:
  void sendEvent(TtsResultType event, int id, int code);

 private:
  bool prepared = false;
  PrepareOptions options;
  shared_ptr<TtsOptions> tts_options;
  shared_ptr<Tts> tts_handle;
  pthread_t polling;
};

#endif
