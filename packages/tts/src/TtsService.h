#ifndef TTS_SERVICE_H
#define TTS_SERVICE_H

#include <speech/tts.h>
#include <stdlib.h>
#include <string>
#include "OpusPlayer.h"

using namespace std;
using namespace rokid;
using namespace speech;

enum TtsStatusCode {
  TTS_OK = 0,
  TTS_NOT_PREPARED,
  TTS_ERROR,
};

typedef void (*send_event_callback)(void*, TtsResultType, int, int);

class TtsService {
 public:
  TtsService(){};
  TtsService(send_event_callback send_event_) {
    send_event = send_event_;
  };
  ~TtsService() {
    tts_handle->release();
  }

  bool prepare(const char* host, int port, const char* branch,
               const char* auth_key, const char* device_type,
               const char* device_id, const char* secret,
               const char* declaimer);
  int speak(const char*);
  int cancel(int id);
  int disconnect();

  static void* PollEvent(void*);

 protected:
  send_event_callback send_event;
  bool prepared = false;

 private:
  PrepareOptions options;
  shared_ptr<TtsOptions> tts_options;
  shared_ptr<Tts> tts_handle;
  pthread_t polling;
};

#endif
