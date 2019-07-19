#include <stdint.h>
#include "pulse/simple.h"
#include "pulse/error.h"
#include "pcm-player.h"

#define LOG_TAG "PcmPlayer"
#include "logger.h"

bool PcmPlayer::init(pa_sample_spec ss) {
  if (stream)
    return true;

  int err;
  stream = pa_simple_new(nullptr, "speech-synthesizer", PA_STREAM_PLAYBACK,
                         nullptr, "tts", &ss, nullptr, nullptr, &err);
  if (stream == nullptr) {
    RKLogw("pa_simple_new error(%d): %s", err, pa_strerror(err));
  } else {
    onevent(pcm_player_started);
  }
  return stream != nullptr;
}

void PcmPlayer::destroy() {
  if (stream) {
    tp.finish();
    pa_simple_free(stream);
    RKLogv("pa_simple_free");
    stream = nullptr;
  }
}

bool PcmPlayer::write(std::vector<uint8_t>& data) {
  if (stream == nullptr) {
    return false;
  }
  if (status == player_status_cancelled || status == player_status_end) {
    return false;
  }
  if (status == player_status_pending) {
    status = player_status_playing;
  }

  tp.push([this, data]() {
    if (stream == nullptr) {
      RKLogw("Unexpected null on stream");
      return;
    }
    auto vstatus = status.load();
    if (vstatus != player_status_playing &&
        vstatus != player_status_pending_end) {
      RKLogw("player status changed on write, current status(%d)", vstatus);
      return;
    }
    int err;

    RKLogv("write data(%zu)", data.size());
    if (pa_simple_write(stream, data.data(), data.size(), &err) < 0) {
      RKLogw("write data error(%d): %s", err, pa_strerror(err));
    }
  });
  return true;
}

void PcmPlayer::end() {
  if (status == player_status_end) {
    RKLogv("player ended, skip draining");
    return;
  }
  if (status == player_status_pending_end || status == player_status_pending) {
    RKLogv("player pending end or not playing, skip draining");
    onevent(pcm_player_ended);
    /** set player as deprecated */
    status = player_status_end;
    return;
  }
  if (status == player_status_playing) {
    status = player_status_pending_end;
  }
  tp.push([this]() {
    if (stream == nullptr) {
      RKLogw("Unexpected null on stream");
      return;
    }
    auto vstatus = status.load();
    if (vstatus != player_status_pending_end &&
        vstatus != player_status_cancelled) {
      RKLogw("player status changed on end, current status(%d)", vstatus);
      return;
    }
    int err;
    RKLogv("draining player");
    do {
      if (pa_simple_drain(stream, &err) < 0) {
        RKLogw("drain player error(%d): %s", err, pa_strerror(err));
      }
    } while (err == /** drain timed out, retrying */ PA_ERR_TIMEOUT);
    RKLogv("drained player, status(%d)", status.load());

    if (status == player_status_cancelled) {
      onevent(pcm_player_cancelled);
    } else {
      onevent(pcm_player_ended);
    }
    /** set player as deprecated */
    status = player_status_end;
  });
}

void PcmPlayer::cancel() {
  if (status == player_status_end) {
    RKLogv("player ended, skip cancelling");
    return;
  }
  if (status != player_status_playing && status != player_status_pending_end) {
    RKLogv("player not playing nor pending end, cancelling");
    onevent(pcm_player_cancelled);
    /** set player as deprecated */
    status = player_status_end;
    return;
  }
  status = player_status_cancelled;
  int err;
  if (pa_simple_flush(stream, &err) < 0) {
    RKLogw("flush data error(%d): %s", err, pa_strerror(err));
  }
  /** clears pending writes */
  tp.finish();
  this->end();
}
