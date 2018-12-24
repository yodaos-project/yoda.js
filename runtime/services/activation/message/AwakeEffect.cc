#include "AwakeEffect.h"
#include "MessageDefine.h"
using namespace rokid;
/*
 * serialize this object as buffer
*/
int32_t AwakeEffect::serialize(void* buf, uint32_t bufsize) const {
  std::shared_ptr<Caps> caps = Caps::new_instance();
  caps->write(static_cast<int32_t>(MessageType::TYPE_AWAKEEFFECT));
  int32_t wRstWakeupId;
  assert(wakeupId);
  wRstWakeupId = caps->write(wakeupId->c_str());
  if (wRstWakeupId != CAPS_SUCCESS) return wRstWakeupId;
  int32_t wRstVoiceId;
  assert(voiceId);
  wRstVoiceId = caps->write(voiceId->c_str());
  if (wRstVoiceId != CAPS_SUCCESS) return wRstVoiceId;
  int32_t wRstWakeupUrl;
  assert(wakeupUrl);
  wRstWakeupUrl = caps->write(wakeupUrl->c_str());
  if (wRstWakeupUrl != CAPS_SUCCESS) return wRstWakeupUrl;
  return caps->serialize(buf, bufsize);
}
/*
 * deserialize this object as caps (with message type)
 */
int32_t AwakeEffect::serialize(std::shared_ptr<Caps> &caps) const {
  if (!caps)
    caps = Caps::new_instance();
  caps->write(static_cast<int32_t>(MessageType::TYPE_AWAKEEFFECT));
  int32_t wRstWakeupId;
  assert(wakeupId);
  wRstWakeupId = caps->write(wakeupId->c_str());
  if (wRstWakeupId != CAPS_SUCCESS) return wRstWakeupId;
  int32_t wRstVoiceId;
  assert(voiceId);
  wRstVoiceId = caps->write(voiceId->c_str());
  if (wRstVoiceId != CAPS_SUCCESS) return wRstVoiceId;
  int32_t wRstWakeupUrl;
  assert(wakeupUrl);
  wRstWakeupUrl = caps->write(wakeupUrl->c_str());
  if (wRstWakeupUrl != CAPS_SUCCESS) return wRstWakeupUrl;
  return CAPS_SUCCESS;
}
/*
 * deserialize this object from buffer
 */
int32_t AwakeEffect::deserialize(void* buf, uint32_t bufSize) {
  std::shared_ptr<Caps> caps;
  int32_t pRst = Caps::parse(buf, bufSize, caps);
  if(pRst != CAPS_SUCCESS) return pRst;
  if (!wakeupId) wakeupId = std::make_shared<std::string>();
  int32_t rRstWakeupId = caps->read_string(*wakeupId);
  if (rRstWakeupId != CAPS_SUCCESS) return rRstWakeupId;
  if (!voiceId) voiceId = std::make_shared<std::string>();
  int32_t rRstVoiceId = caps->read_string(*voiceId);
  if (rRstVoiceId != CAPS_SUCCESS) return rRstVoiceId;
  if (!wakeupUrl) wakeupUrl = std::make_shared<std::string>();
  int32_t rRstWakeupUrl = caps->read_string(*wakeupUrl);
  if (rRstWakeupUrl != CAPS_SUCCESS) return rRstWakeupUrl;
  return CAPS_SUCCESS;
}
/*
 * deserialize this object from caps (with message type)
 */
int32_t AwakeEffect::deserialize(std::shared_ptr<Caps> &caps) {
  if (!wakeupId) wakeupId = std::make_shared<std::string>();
  int32_t rRstWakeupId = caps->read_string(*wakeupId);
  if (rRstWakeupId != CAPS_SUCCESS) return rRstWakeupId;
  if (!voiceId) voiceId = std::make_shared<std::string>();
  int32_t rRstVoiceId = caps->read_string(*voiceId);
  if (rRstVoiceId != CAPS_SUCCESS) return rRstVoiceId;
  if (!wakeupUrl) wakeupUrl = std::make_shared<std::string>();
  int32_t rRstWakeupUrl = caps->read_string(*wakeupUrl);
  if (rRstWakeupUrl != CAPS_SUCCESS) return rRstWakeupUrl;
  return CAPS_SUCCESS;
}
/*
 * serialize this object as caps (without message type)
 */
int32_t AwakeEffect::serializeForCapsObj(std::shared_ptr<Caps> &caps) const {
  caps = Caps::new_instance();
  int32_t wRstWakeupId;
  assert(wakeupId);
  wRstWakeupId = caps->write(wakeupId->c_str());
  if (wRstWakeupId != CAPS_SUCCESS) return wRstWakeupId;
  int32_t wRstVoiceId;
  assert(voiceId);
  wRstVoiceId = caps->write(voiceId->c_str());
  if (wRstVoiceId != CAPS_SUCCESS) return wRstVoiceId;
  int32_t wRstWakeupUrl;
  assert(wakeupUrl);
  wRstWakeupUrl = caps->write(wakeupUrl->c_str());
  if (wRstWakeupUrl != CAPS_SUCCESS) return wRstWakeupUrl;
  return CAPS_SUCCESS;
}
/*
 * deserialize this object from caps (without message type)
 */
int32_t AwakeEffect::deserializeForCapsObj(std::shared_ptr<Caps> &caps) {
  if (!wakeupId) wakeupId = std::make_shared<std::string>();
  int32_t rRstWakeupId = caps->read_string(*wakeupId);
  if (rRstWakeupId != CAPS_SUCCESS) return rRstWakeupId;
  if (!voiceId) voiceId = std::make_shared<std::string>();
  int32_t rRstVoiceId = caps->read_string(*voiceId);
  if (rRstVoiceId != CAPS_SUCCESS) return rRstVoiceId;
  if (!wakeupUrl) wakeupUrl = std::make_shared<std::string>();
  int32_t rRstWakeupUrl = caps->read_string(*wakeupUrl);
  if (rRstWakeupUrl != CAPS_SUCCESS) return rRstWakeupUrl;
  return CAPS_SUCCESS;
}

