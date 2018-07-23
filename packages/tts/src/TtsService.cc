#include <stdio.h>
#include <utils/String8.h>
#include <fstream>
#include <string>
#include <map>
#include "TtsService.h"

using namespace std;
using namespace rokid;

static OpusPlayer _player;

int TtsService::speak(const char* content) {
  if (!prepared) {
    return TTS_NOT_PREPARED;
  }
  int id = tts_handle->speak(content);
  return id;
}

int TtsService::cancel(int id) {
  if (!prepared) {
    return TTS_NOT_PREPARED;
  }
  tts_handle->cancel(id);
  _player.reset();
}

int TtsService::disconnect() {
  if (!prepared) {
    return 0;
  }
  if (tts_handle)
    tts_handle->release();
  _player.reset();
  prepared = false;
  return 0;
}

void* TtsService::PollEvent(void* params) {
  TtsResult res;
  TtsService* self = (TtsService*)params;

  while (true) {
    if (!self->tts_handle->poll(res)) {
      fprintf(stderr, "tts poll failed\n");
      break;
    }
    switch (res.type) {
      case TTS_RES_VOICE: {
        size_t size = res.voice.get()->size();
        if (size > 0) {
          _player.play(res.voice.get()->data(), size);
        } else {
          fprintf(stderr, "voice size=0\n");
        }
        break;
      }
      case TTS_RES_START: {
        self->send_event(self, TTS_RES_START, res.id, 0);
        break;
      }
      case TTS_RES_END: {
        self->send_event(self, TTS_RES_END, res.id, 0);
        break;
      }
      case TTS_RES_CANCELLED: {
        self->send_event(self, TTS_RES_CANCELLED, res.id, 0);
        break;
      }
      case TTS_RES_ERROR: {
        self->send_event(self, TTS_RES_ERROR, res.id, res.err);
        break;
      }
    }
  }
  self->tts_handle->release();
  return NULL;
}

bool TtsService::prepare(const char* host, 
                         int port, 
                         const char* branch,
                         const char* auth_key, 
                         const char* device_type,
                         const char* device_id, 
                         const char* secret,
                         const char* declaimer) {
  if (prepared) {
    return true;
  }
  
  options.host.assign(host);
  options.port = port;
  options.branch.assign(branch);
  options.key.assign(auth_key);
  options.device_type_id.assign(device_type);
  options.device_id.assign(device_id);
  options.secret.assign(secret);
  //options.reconn_interval = 3000;
  //options.ping_interval = 5000;
  //options.no_resp_timeout = 3000;

  tts_handle = Tts::new_instance();
  tts_options = TtsOptions::new_instance();
  if (declaimer) {
    tts_options->set_declaimer(std::string(declaimer));
  }

  if (!tts_options ||
    !tts_handle ||
    !tts_handle->prepare(options)) {
    goto terminate;
  }
  tts_options->set_codec(Codec::OPU2);
  tts_handle->config(tts_options);

  if (pthread_create(&polling, NULL, TtsService::PollEvent, this)) {
    goto terminate;
  }
  pthread_detach(polling);
  prepared = true;
  return true;

terminate:
  if (tts_handle)
    tts_handle->release();
  printf("release tts\n");
  return false;
}
