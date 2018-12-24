#ifndef _CUSTOMAWAKEEFFECT_H
#define _CUSTOMAWAKEEFFECT_H
#include <vector>
#include <string>
#include <memory>
#include "caps.h"
#include "AwakeEffect.h"
namespace rokid {
  /*
   * 
   */
  class CustomAwakeEffect {
  private:
    std::shared_ptr<std::string> action = nullptr;
    int32_t type = 0;
    std::shared_ptr<std::vector<AwakeEffect>> value = nullptr;
  public:
    inline static std::shared_ptr<CustomAwakeEffect> create() {
      return std::make_shared<CustomAwakeEffect>();
    }
    /*
    * getter 'open'/'close'
    */
    inline const std::shared_ptr<std::string> getAction() const {
      return action;
    }
    /*
    * getter 0: default 1: custom
    */
    inline int32_t getType() const {
      return type;
    }
    /*
    * getter array of awake effect
    */
    inline const std::shared_ptr<std::vector<AwakeEffect>> getValue() const {
      return value;
    }
    /*
    * setter 'open'/'close'
    */
    inline void setAction(const std::shared_ptr<std::string> &v) {
      action = v;
    }
    /*
    * setter 'open'/'close'
    */
    inline void setAction(const char* v) {
      if (!action)    action = std::make_shared<std::string>();  *action = v;
    }
    /*
    * setter 0: default 1: custom
    */
    inline void setType(int32_t v) {
      type = v;
    }
    /*
    * setter array of awake effect
    */
    inline void setValue(const std::shared_ptr<std::vector<AwakeEffect>> &v) {
      this->value = v;
    }
    /*
     * serialize this object as buffer
    */
    int32_t serialize(void* buf, uint32_t bufsize) const;
    /*
     * deserialize this object as caps (with message type)
     */
    int32_t serialize(std::shared_ptr<Caps> &caps) const;
    /*
     * deserialize this object from buffer
     */
    int32_t deserialize(void* buf, uint32_t bufSize);
    /*
     * deserialize this object from caps (with message type)
     */
    int32_t deserialize(std::shared_ptr<Caps> &caps);
    /*
     * serialize this object as caps (without message type)
     */
    int32_t serializeForCapsObj(std::shared_ptr<Caps> &caps) const;
    /*
     * deserialize this object from caps (without message type)
     */
    int32_t deserializeForCapsObj(std::shared_ptr<Caps> &caps);
  };

}
#endif // _CUSTOMAWAKEEFFECT_H