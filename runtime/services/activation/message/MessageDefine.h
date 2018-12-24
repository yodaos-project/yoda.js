#ifndef _MESSAGEDEFINE_H
#define _MESSAGEDEFINE_H
#include <memory>
#include <assert.h>
namespace rokid{
  /*
  * enum of message type
  */
  enum class MessageType: int32_t {
    TYPE_CUSTOMAWAKEEFFECT = 1111,
    TYPE_AWAKEEFFECT,
    TYPE_UNKNOWN
  };
}
#endif //_MESSAGEDEFINE_H