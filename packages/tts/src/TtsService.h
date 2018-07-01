#ifndef TTS_SERVICE_H
#define TTS_SERVICE_H

#include <pthread>
#include <stdlib>
#include <map>
#include <list>
#include <string>
#include <speech/tts.h>
#include "OpusPlayer.h"

using namespace std;
using namespace rokid;
using namespace speech;

class TtsService {
 public:
  TtsService();
  bool prepare(const char* host,
               int port,
               const char* branch,
               const char* auth_key,
               const char* device_type,
               const char* device_id,
               const char* secret,
               const char* declaimer);
  int speak(const char*);
  void cancel(int id);
  void disconnect();

  static void* PollEvent(void* params);

 private:
  bool prepared = false;
  PrepareOptions options;
  shared_ptr<TtsOptions> tts_options;
  shared_ptr<Tts> tts_handle;
  pthread_t polling;
};

#endif
