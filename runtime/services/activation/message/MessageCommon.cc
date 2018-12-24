#include "MessageCommon.h"
namespace rokid {
  MessageType get_msg_type(const unsigned char * buff, int32_t buff_len, std::shared_ptr<Caps> &caps) {
    if (Caps::parse(buff, buff_len, caps) != CAPS_SUCCESS)
      goto ERROR;
    int32_t msg_type;
    if (caps->read(msg_type) != CAPS_SUCCESS)
      goto ERROR;
    return static_cast<MessageType>(msg_type);
  ERROR:
    return MessageType::TYPE_UNKNOWN;
  }
  MessageType get_msg_type(std::shared_ptr<Caps> &caps) {
    int32_t msg_type;
    if (caps->read(msg_type) != CAPS_SUCCESS)
      goto ERROR;
    return static_cast<MessageType>(msg_type);
  ERROR:
    return MessageType::TYPE_UNKNOWN;
  }
}
