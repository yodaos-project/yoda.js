#ifndef MULTIMEDIA_NATIVE_H
#define MULTIMEDIA_NATIVE_H

#include <stdio.h>
#include <stdlib.h>

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>
#include <uv.h>
#include <mediaplayer.h>

class MultimediaListener;

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  MediaPlayer* handle;
  MultimediaListener* listener;
  uv_async_t close_handle;
  uint32_t id;
} IOTJS_VALIDATED_STRUCT(iotjs_player_t);

typedef struct {
  iotjs_player_t* player;
  int type;
  int ext1;
  int ext2;
  int from;
} iotjs_player_event_t;

/**
 * @class MultimediaListener
 */
class MultimediaListener : public MediaPlayerListener {
 public:
  MultimediaListener(iotjs_player_t* player_) {
    prepared = false;
    player = player_;
  };
  ~MultimediaListener() {
    prepared = false;
    player = NULL;
  };

 public:
  /**
   * @method notify
   * @param {Integer} msg
   * @param {Integer} ext1
   * @param {Integer} ext2
   * @param {Integer} from - the notify from thread
   */
  void notify(int msg, int ext1, int ext2, int from);
  static void DoNotify(uv_async_t* handle);
  static void AfterNotify(uv_handle_t* handle);
  /**
   * @method isPrepared
   * @return {Boolean} if the player is prepared
   */
  bool isPrepared();
  /**
   * @method getPlayer
   * @return {iotjs_player_t*}
   */
  iotjs_player_t* getPlayer();

 private:
  bool prepared;
  iotjs_player_t* player;
};

static iotjs_player_t* iotjs_player_create(jerry_value_t jplayer);
static void iotjs_player_destroy(iotjs_player_t* player);
static void iotjs_player_onclose(uv_async_t* handle);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // MULTIMEDIA_NATIVE_H
