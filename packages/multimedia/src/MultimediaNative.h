#ifndef MULTIMEDIA_NATIVE_H
#define MULTIMEDIA_NATIVE_H

#include <stdlib.h>
#include <stdio.h>

#ifdef __cplusplus
extern "C"
{
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>
#include <mediaplayer.h>

/**
 * @class MultimediaListener
 */
class MultimediaListener : public MediaPlayerListener {
 public:
  MultimediaListener() {
    prepared = false;
  };
  ~MultimediaListener() {};
 
 public:
  /**
   * @method notify
   * @param {Integer} msg
   * @param {Integer} ext1
   * @param {Integer} ext2
   * @param {Integer} from - the notify from thread
   */
  void notify(int msg, int ext1, int ext2, int from);
  /**
   * @method isPrepared
   * @return {Boolean} if the player is prepared
   */
  bool isPrepared();

 private:
  bool prepared;
};

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  MediaPlayer* handle;
  MultimediaListener* listener;
  uint32_t id;
} IOTJS_VALIDATED_STRUCT(iotjs_player_t);

static iotjs_player_t* iotjs_player_create(jerry_value_t jplayer);
static void iotjs_player_destroy(iotjs_player_t* player);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // MULTIMEDIA_NATIVE_H
