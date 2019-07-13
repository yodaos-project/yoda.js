#pragma once

#include <stdint.h>
#include <mutex>
#include "pulse/simple.h"
#include "pulse/error.h"
#include "thr-pool.h"

typedef enum {
  player_status_pending = 0,
  player_status_playing,
  player_status_pending_end,
  player_status_end,
  player_status_cancelled,
} PcmPlayerStatus;

typedef enum {
  pcm_player_started = 0,
  pcm_player_ended,
  pcm_player_cancelled,
} PcmPlayerEvent;

typedef std::function<void(PcmPlayerEvent e)> EventListener;

class PcmPlayer {
 public:
  PcmPlayer(EventListener l) : onevent(l){};
  ~PcmPlayer() {
    destroy();
  };
  bool init(pa_sample_spec ss);
  void destroy();

  bool write(std::vector<uint8_t>& data);
  void end();
  void cancel();

 private:
  EventListener onevent;
  pa_simple* stream = nullptr;
  ThreadPool tp{ 1 };
  PcmPlayerStatus status = player_status_pending;
};
