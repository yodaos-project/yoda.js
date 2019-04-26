#include <stdint.h>
#include "pulse/simple.h"
#include "pulse/error.h"
#include "pcm-player.h"

bool PcmPlayer::init(pa_sample_spec ss) {
  if (stream)
    return true;

  tp = new ThreadPool(1);
  drainp = new ThreadPool(1);
  int err;
  stream = pa_simple_new(nullptr, "speech-synthesizer", PA_STREAM_PLAYBACK,
                         nullptr, "tts", &ss, nullptr, nullptr, &err);
  if (stream == nullptr) {
    fprintf(stderr, "[PcmPlayer] pa_simple_new error(%d): %s\n", err,
            pa_strerror(err));
  }
  return stream != nullptr;
}

void PcmPlayer::destroy() {
  if (stream) {
    pa_simple_free(stream);
    fprintf(stdout, "[PcmPlayer] pa_simple_free\n");
    stream = nullptr;
    tp->close();
    delete tp;
    drainp->close();
    delete drainp;
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
      fprintf(stderr, "[PcmPlayer] Unexpected null on stream");
      return;
    }
    if (status != player_status_playing &&
        status != player_status_pending_end) {
      fprintf(
          stderr,
          "[PcmPlayer] player status changed on write, current status(%d)\n",
          status);
      return;
    }
    int err;

    fprintf(stdout, "[PcmPlayer] write data(%d)\n", data.size());
    if (pa_simple_write(stream, data.data(), data.size(), &err) < 0) {
      fprintf(stderr, "[PcmPlayer] write data error(%d): %s\n", err,
              pa_strerror(err));
    }
  });
}

void PcmPlayer::end() {
  if (status == player_status_pending_end || status == player_status_pending) {
    fprintf(stdout,
            "[PcmPlayer] player pending end or not playing, skip draining\n");
    return;
  }
  if (status == player_status_playing) {
    status = player_status_pending_end;
  }
  drainp->push([this]() {
    if (stream == nullptr) {
      fprintf(stderr, "[PcmPlayer] Unexpected null on stream\n");
      return;
    }
    if (status != player_status_pending_end &&
        status != player_status_cancelled) {
      fprintf(stderr,
              "[PcmPlayer] player status changed on end, current status(%d)\n",
              status);
      return;
    }
    int err;
    fprintf(stdout, "[PcmPlayer] draining player\n");
    if (pa_simple_drain(stream, &err) < 0) {
      fprintf(stderr, "[PcmPlayer] drain player error(%d): %s\n", err,
              pa_strerror(err));
    }
    fprintf(stdout, "[PcmPlayer] drained player, status(%d)\n", status);

    if (status == player_status_cancelled) {
      onevent(pcm_player_cancelled);
    } else {
      onevent(pcm_player_ended);
    }
    status = player_status_pending;
  });
}

void PcmPlayer::cancel() {
  status = player_status_cancelled;
  int err;
  if (pa_simple_flush(stream, &err) < 0) {
    fprintf(stderr, "[PcmPlayer] flush data error(%d): %s\n", err,
            pa_strerror(err));
  }
  tp->finish();
  this->end();
}
