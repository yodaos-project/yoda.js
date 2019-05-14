#pragma once

#define NODE_ADDON_API_DISABLE_DEPRECATED
#define NAPI_EXPERIMENTAL
#define NAPI_VERSION 4
#include "napi.h"
#include <librplayer/MediaPlayer.h>
#if defined(__GLIBC__)
#include <malloc.h>
#endif // defined(__GLIBC__)
#include <stdio.h>

class MediaPlayerEvent {
 public:
  MediaPlayerEvent(int type, int ext1, int ext2, int from)
      : type(type), ext1(ext1), ext2(ext2), from(from){};

  int type;
  int ext1;
  int ext2;
  int from;
};

class MediaPlayerWrap : public Napi::ObjectWrap<MediaPlayerWrap>,
                        public MediaPlayerListener {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  MediaPlayerWrap(const Napi::CallbackInfo& info);
  ~MediaPlayerWrap();

  /** instance methods */
  Napi::Value setup(const Napi::CallbackInfo& info);
  void teardown();

  /** instance methods: playback control */
  Napi::Value setDataSource(const Napi::CallbackInfo& info);
  Napi::Value prepare(const Napi::CallbackInfo& info);
  Napi::Value start(const Napi::CallbackInfo& info);
  Napi::Value stop(const Napi::CallbackInfo& info);
  Napi::Value pause(const Napi::CallbackInfo& info);
  Napi::Value seekTo(const Napi::CallbackInfo& info);
  Napi::Value reset(const Napi::CallbackInfo& info);

  Napi::Value getAudioSessionId(const Napi::CallbackInfo& info);
  Napi::Value setAudioSessionId(const Napi::CallbackInfo& info);
  Napi::Value getDuration(const Napi::CallbackInfo& info);
  Napi::Value getPosition(const Napi::CallbackInfo& info);
  Napi::Value getPlaying(const Napi::CallbackInfo& info);
  Napi::Value getLooping(const Napi::CallbackInfo& info);
  Napi::Value setLooping(const Napi::CallbackInfo& info);
  Napi::Value setTempoDelta(const Napi::CallbackInfo& info);
  Napi::Value getVolume(const Napi::CallbackInfo& info);
  Napi::Value setVolume(const Napi::CallbackInfo& info);

  /**
   * notify from rplayer.
   *
   * @param msg
   *        message type, valid type is defined in enum media_event_type in
   * rk_ffplay.h.
   *
   * @param ext1
   *        extra message, for MEDIA_BLOCK_PAUSE_MODE means status of block
   * pause mode defined in enum block_pause_mode_status in rk_ffplay.h; for
   * MEDIA_PLAYING_STATUS means time interval.
   *
   * @param ext2
   *        extra message, for MEDIA_PLAYING_STATUS means decoded frame time.
   *
   * @param fromThread
   *        from rplayer or not.
   *
   */
  void notify(int type, int ext1, int ext2, int from);
  void onevent(Napi::Function fn, MediaPlayerEvent* ev);

 private:
  bool guardPlayer(Napi::Env env, bool shouldPrepared = false);
  bool guardStatus(Napi::Env env, status_t status);
  MediaPlayer* player = nullptr;
  napi_threadsafe_function tsfn;
};
