#include <stdint.h>
#include "pulse/simple.h"
#include "pulse/error.h"
#include "pcm-player.h"

#define LOG_TAG "PcmPlayer"
#include "logger.h"

bool PcmPlayer::init(pa_sample_spec ss) {
  if (stream)
    return true;

  tp = new ThreadPool(1);
  int err;
  stream = pa_simple_new(nullptr, "speech-synthesizer", PA_STREAM_PLAYBACK,
                         nullptr, "tts", &ss, nullptr, nullptr, &err);
  if (stream == nullptr) {
    RKLogw("pa_simple_new error(%d): %s", err, pa_strerror(err));
  }
  return stream != nullptr;
}

void PcmPlayer::destroy() {
  if (stream) {
    pa_simple_free(stream);
    RKLogv("pa_simple_free");
    stream = nullptr;
    tp->close();
    delete tp;
  }
}

void PcmPlayer::write(std::vector<uint8_t>& data) {
  if (stream == nullptr) {
    return;
  }
  if (status == player_status_cancelled) {
    return;
  }
  if (status == player_status_pending) {
    status = player_status_playing;
    onevent(pcm_player_started);
  }

  tp->push([this, data]() {
    if (stream == nullptr) {
      RKLogw("Unexpected null on stream");
      return;
    }
    if (status != player_status_playing &&
        status != player_status_pending_end) {
      RKLogw("player status changed on write, current status(%d)", status);
      return;
    }
    int err;

    RKLogv("write data(%zu)", data.size());
    if (pa_simple_write(stream, data.data(), data.size(), &err) < 0) {
      RKLogw("write data error(%d): %s", err, pa_strerror(err));
    }
  });
}

void PcmPlayer::end() {
  if (status == player_status_pending_end || status == player_status_pending) {
    RKLogv("player pending end or not playing, skip draining");
    return;
  }
  if (status == player_status_playing) {
    status = player_status_pending_end;
  }
  tp->push([this]() {
    if (stream == nullptr) {
      RKLogw("Unexpected null on stream");
      return;
    }
    if (status != player_status_pending_end &&
        status != player_status_cancelled) {
      RKLogw("player status changed on end, current status(%d)", status);
      return;
    }
    int err;
    RKLogv("draining player");
    do {
      if (pa_simple_drain(stream, &err) < 0) {
        RKLogw("drain player error(%d): %s", err, pa_strerror(err));
      }
    } while (err == /** drain timed out, retrying */ PA_ERR_TIMEOUT);
    RKLogv("drained player, status(%d)", status);

    if (status == player_status_cancelled) {
      onevent(pcm_player_cancelled);
    } else {
      onevent(pcm_player_ended);
    }
    status = player_status_pending;
    /** clears all pending tasks on end */
    tp->clear();
  });
}

void PcmPlayer::cancel() {
  if (status != player_status_playing && status != player_status_pending_end) {
    RKLogv("player not playing nor pending end, skip cancelling");
    return;
  }
  status = player_status_cancelled;
  int err;
  if (pa_simple_flush(stream, &err) < 0) {
    RKLogw("flush data error(%d): %s", err, pa_strerror(err));
  }
  /** clears pending writes */
  tp->clear();
  this->end();
}
