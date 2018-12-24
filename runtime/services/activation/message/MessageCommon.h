#ifndef _MESSAGECOMMON_H
#define _MESSAGECOMMON_H
#include "caps.h"
#include "MessageDefine.h"
#include "CustomAwakeEffect.h"
#include "AwakeEffect.h"
#include <vector>
#include <string>
namespace rokid{
  /*
  * type define for shared_ptr
  */
  typedef std::shared_ptr<CustomAwakeEffect> CustomAwakeEffectPtr;
  typedef std::shared_ptr<AwakeEffect> AwakeEffectPtr;
  /*
   * you should call this function when you got message package,
   * [in] buff: the packgae buffer
   * [in] buffer_len: then buffer length
   * [out] caps: the caps object contain message, but without message type
   * return message type if success, else return MessageType::TYPE_UNKNOWN
   */
  MessageType get_msg_type(const unsigned char * buff, int32_t buff_len, std::shared_ptr<Caps> &caps);
  MessageType get_msg_type(std::shared_ptr<Caps> &caps);
}
#endif //_MESSAGECOMMON_H
