#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

#include <pulse/def.h>
#include <pulse/error.h>
#include <pulse/sample.h>
#include <pulse/simple.h>

#include "OpusPlayer.h"
#include "utils/Log.h"

#include <mutex>  // std::mutex, std::unique_lock
#include <thread> // std::thread

static std::mutex ttsPlayerMutex;

OpusPlayer::OpusPlayer() {
  std::lock_guard<std::mutex> lock(ttsPlayerMutex);

  int error;
  /* Create a new playback stream */
  if (!(s = pa_simple_new(NULL, "ttsplayer", PA_STREAM_PLAYBACK, NULL, "tts",
                          &ss, NULL, NULL, &error))) {
    ALOGW("pa_simple_new() failed: %s\n", pa_strerror(error));
    pa_simple_free(s);
    s = NULL;
  }
  _opus = new OpusCodec((int)SampleRate, channels, 16000, (int)Application);
  _silentDataLen = ss.rate * ss.channels * 2 / 100 * 4; // 40ms的安静声音
  ALOGW("%s _silentDataLen %ld", __func__, _silentDataLen);
  _silentData = new uint8_t[_silentDataLen];
  memset(_silentData, 0, _silentDataLen);
}

OpusPlayer::~OpusPlayer() {
  if (s) {
    pa_simple_free(s);
    s = NULL;
  }
  if (_opus) {
    delete _opus;
    _opus = NULL;
  }
}

void OpusPlayer::play(const char* data, size_t length) {
  std::lock_guard<std::mutex> lock(ttsPlayerMutex);

  int error;
  char* pcm_out;
  uint32_t pcm_out_length;

  if (!_opus) {
    _opus = new OpusCodec((int)SampleRate, channels, 16000, (int)Application);
  }

  pcm_out_length =
      _opus->native_opus_decode(_opus->decoder, data, length, pcm_out);
  if (s) {
    pa_simple_write(s, pcm_out, pcm_out_length, &error);
  }
  // TODO(Yorkie): the pcm_out was alloced in native_opus_decode, need change
  delete[] pcm_out;
}

void OpusPlayer::reset() {
  std::lock_guard<std::mutex> lock(ttsPlayerMutex);

  if (s) {
    int err = 0;
    pa_simple_flush(s, &err);
    ALOGW("pa_simple_flush err %d", err);
    pa_simple_write(s, _silentData, _silentDataLen, &err);
    pa_simple_drain(s, &err);
  }
  if (_opus) {
    delete _opus;
    _opus = NULL;
  }
}

void OpusPlayer::drain() {
  std::lock_guard<std::mutex> lock(ttsPlayerMutex);

  if (s) {
    int err = 0;
    pa_simple_write(s, _silentData, _silentDataLen, &err);
    ALOGW("pa_simple_drain start");
    pa_simple_drain(s, &err);
    ALOGW("pa_simple_drain err %d", err);
  }
  if (_opus) {
    delete _opus;
    _opus = NULL;
  }
}
