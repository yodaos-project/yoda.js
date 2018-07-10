#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <fcntl.h>

#include <pulse/simple.h>
#include <pulse/error.h>
#include <pulse/def.h>
#include <pulse/sample.h>

#include "OpusPlayer.h"
#include "utils/Log.h"

#include <thread>   // std::thread
#include <mutex>    // std::mutex, std::unique_lock

static std::mutex ttsPlayerMutex;

OpusPlayer::OpusPlayer() {
  std::lock_guard<std::mutex> lock(ttsPlayerMutex);

  int error;
  /* Create a new playback stream */
  if (!(s = pa_simple_new(NULL, "ttsplayer", PA_STREAM_PLAYBACK, NULL, "tts", &ss, NULL, NULL, &error))) {
    ALOGW("pa_simple_new() failed: %s\n", pa_strerror(error));
    pa_simple_free(s);
    s = NULL;
  }
  _opus = new OpusCodec((int)SampleRate, channels, 16000, (int)Application);
}

OpusPlayer::~OpusPlayer() {
  if (s) {
    pa_simple_free(s);
    s = NULL;
  }
  delete _opus;
  _opus = NULL;
}

void OpusPlayer::play(const char* data, size_t length) {
  std::lock_guard<std::mutex> lock(ttsPlayerMutex);

  int error;
  char* pcm_out;
  uint32_t pcm_out_length;

  pcm_out_length = _opus->native_opus_decode(_opus->decoder, data, length, pcm_out);
  if (s) {
    pa_simple_write(s, pcm_out, pcm_out_length, &error);
  }
  // TODO(Yorkie): the pcm_out was alloced in native_opus_decode, need change
  delete[] pcm_out;
}

void OpusPlayer::reset() {
  std::lock_guard<std::mutex> lock(ttsPlayerMutex);

  if (s) {
    pa_simple_free(s);
    s = NULL;
  }
  int error;

  /* Create a new playback stream */
  if (!(s = pa_simple_new(NULL, "ttsplayer", PA_STREAM_PLAYBACK, NULL, "tts", &ss, NULL, NULL, &error))) {
    ALOGW("pa_simple_new() failed: %s\n", pa_strerror(error));
    pa_simple_free(s);
    s = NULL;
  }
}
