#include "CustomAwakeEffect.h"
#include "MessageDefine.h"
using namespace rokid;
/*
 * serialize this object as buffer
*/
int32_t CustomAwakeEffect::serialize(void* buf, uint32_t bufsize) const {
  std::shared_ptr<Caps> caps = Caps::new_instance();
  caps->write(static_cast<int32_t>(MessageType::TYPE_CUSTOMAWAKEEFFECT));
  int32_t wRstAction;
  assert(action);
  wRstAction = caps->write(action->c_str());
  if (wRstAction != CAPS_SUCCESS) return wRstAction;
  int32_t wRstType = caps->write((int32_t)type);
  if (wRstType != CAPS_SUCCESS) return wRstType;
  if (!value)
    caps->write((int32_t)0);
  else {
    caps->write((int32_t)value->size());
    for(auto &v : *value) {
      std::shared_ptr<Caps> c;
      int32_t sRst = v.serializeForCapsObj(c);
      if (sRst != CAPS_SUCCESS)
      return sRst;
      else {
        int32_t wRst = caps->write(c);
        if (wRst != CAPS_SUCCESS) return wRst;
      }
    }
  }
  return caps->serialize(buf, bufsize);
}
/*
 * deserialize this object as caps (with message type)
 */
int32_t CustomAwakeEffect::serialize(std::shared_ptr<Caps> &caps) const {
  if (!caps)
    caps = Caps::new_instance();
  caps->write(static_cast<int32_t>(MessageType::TYPE_CUSTOMAWAKEEFFECT));
  int32_t wRstAction;
  assert(action);
  wRstAction = caps->write(action->c_str());
  if (wRstAction != CAPS_SUCCESS) return wRstAction;
  int32_t wRstType = caps->write((int32_t)type);
  if (wRstType != CAPS_SUCCESS) return wRstType;
  if (!value)
    caps->write((int32_t)0);
  else {
    caps->write((int32_t)value->size());
    for(auto &v : *value) {
      std::shared_ptr<Caps> c;
      int32_t sRst = v.serializeForCapsObj(c);
      if (sRst != CAPS_SUCCESS)
      return sRst;
      else {
        int32_t wRst = caps->write(c);
        if (wRst != CAPS_SUCCESS) return wRst;
      }
    }
  }
  return CAPS_SUCCESS;
}
/*
 * deserialize this object from buffer
 */
int32_t CustomAwakeEffect::deserialize(void* buf, uint32_t bufSize) {
  std::shared_ptr<Caps> caps;
  int32_t pRst = Caps::parse(buf, bufSize, caps);
  if(pRst != CAPS_SUCCESS) return pRst;
  if (!action) action = std::make_shared<std::string>();
  int32_t rRstAction = caps->read_string(*action);
  if (rRstAction != CAPS_SUCCESS) return rRstAction;
  int32_t rRstType = caps->read(type);
  if (rRstType != CAPS_SUCCESS) return rRstType;
  int32_t arraySizeValue = 0;
  int32_t rRstValue = caps->read(arraySizeValue);
  if (rRstValue != CAPS_SUCCESS) return rRstValue;
  if (!value)
    value = std::make_shared<std::vector<AwakeEffect>>();
  else
    value->clear();
  for(int32_t i = 0; i < arraySizeValue;++i) {
    std::shared_ptr<Caps> c;
    if (caps->read(c) == CAPS_SUCCESS && c) {
      value->emplace_back();
      int32_t dRst = value->back().deserializeForCapsObj(c);
      if (dRst != CAPS_SUCCESS) return dRst;
    }
  }
  return CAPS_SUCCESS;
}
/*
 * deserialize this object from caps (with message type)
 */
int32_t CustomAwakeEffect::deserialize(std::shared_ptr<Caps> &caps) {
  if (!action) action = std::make_shared<std::string>();
  int32_t rRstAction = caps->read_string(*action);
  if (rRstAction != CAPS_SUCCESS) return rRstAction;
  int32_t rRstType = caps->read(type);
  if (rRstType != CAPS_SUCCESS) return rRstType;
  int32_t arraySizeValue = 0;
  int32_t rRstValue = caps->read(arraySizeValue);
  if (rRstValue != CAPS_SUCCESS) return rRstValue;
  if (!value)
    value = std::make_shared<std::vector<AwakeEffect>>();
  else
    value->clear();
  for(int32_t i = 0; i < arraySizeValue;++i) {
    std::shared_ptr<Caps> c;
    if (caps->read(c) == CAPS_SUCCESS && c) {
      value->emplace_back();
      int32_t dRst = value->back().deserializeForCapsObj(c);
      if (dRst != CAPS_SUCCESS) return dRst;
    }
  }
  return CAPS_SUCCESS;
}
/*
 * serialize this object as caps (without message type)
 */
int32_t CustomAwakeEffect::serializeForCapsObj(std::shared_ptr<Caps> &caps) const {
  caps = Caps::new_instance();
  int32_t wRstAction;
  assert(action);
  wRstAction = caps->write(action->c_str());
  if (wRstAction != CAPS_SUCCESS) return wRstAction;
  int32_t wRstType = caps->write((int32_t)type);
  if (wRstType != CAPS_SUCCESS) return wRstType;
  if (!value)
    caps->write((int32_t)0);
  else {
    caps->write((int32_t)value->size());
    for(auto &v : *value) {
      std::shared_ptr<Caps> c;
      int32_t sRst = v.serializeForCapsObj(c);
      if (sRst != CAPS_SUCCESS)
      return sRst;
      else {
        int32_t wRst = caps->write(c);
        if (wRst != CAPS_SUCCESS) return wRst;
      }
    }
  }
  return CAPS_SUCCESS;
}
/*
 * deserialize this object from caps (without message type)
 */
int32_t CustomAwakeEffect::deserializeForCapsObj(std::shared_ptr<Caps> &caps) {
  if (!action) action = std::make_shared<std::string>();
  int32_t rRstAction = caps->read_string(*action);
  if (rRstAction != CAPS_SUCCESS) return rRstAction;
  int32_t rRstType = caps->read(type);
  if (rRstType != CAPS_SUCCESS) return rRstType;
  int32_t arraySizeValue = 0;
  int32_t rRstValue = caps->read(arraySizeValue);
  if (rRstValue != CAPS_SUCCESS) return rRstValue;
  if (!value)
    value = std::make_shared<std::vector<AwakeEffect>>();
  else
    value->clear();
  for(int32_t i = 0; i < arraySizeValue;++i) {
    std::shared_ptr<Caps> c;
    if (caps->read(c) == CAPS_SUCCESS && c) {
      value->emplace_back();
      int32_t dRst = value->back().deserializeForCapsObj(c);
      if (dRst != CAPS_SUCCESS) return dRst;
    }
  }
  return CAPS_SUCCESS;
}

