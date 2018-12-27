#ifndef TTS_SERVICE_H
#define TTS_SERVICE_H

#include <speech/tts.h>
#include <stdlib.h>
#include <string>
#include <librplayer/OpusPlayer.h>
#include <cutils/properties.h>
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
  explicit TtsService(send_event_callback send_event_) {
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
  void reconnect();

  static void* PollEvent(void*);

 protected:
  send_event_callback send_event;
  bool prepared = false;
  bool need_destroy_ = false;
  bool holdconnect = true;

 private:
  PrepareOptions options;
  shared_ptr<TtsOptions> tts_options;
  shared_ptr<Tts> tts_handle;
  pthread_t polling;
};

#endif
