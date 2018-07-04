#ifndef TTS_OPUS_PLAYER_H
#define TTS_OPUS_PLAYER_H

#include <pulse/simple.h>
#include <pulse/error.h>
#include "OpusCodec.h"

class OpusPlayer {
 public:
  OpusPlayer();
  ~OpusPlayer();
  
  void play(const char* data, size_t length);
  void reset();
 
 private:
  pa_simple *s;

  /* The Sample format to use */
  /*todo:init pa sample */
  //pa_sample_spec ss;
  const pa_sample_spec ss = {
    .format = PA_SAMPLE_S16LE,
    .rate = 24000,
    .channels = 1,
  };
    
  int channels = 1;
  OpusSampleRate SampleRate = SR_24K;
  OpusApplication Application = AUDIO;
  OpusCodec* _opus;
};

#endif

