#ifndef _AWAKEEFFECT_H
#define _AWAKEEFFECT_H
#include <vector>
#include <string>
#include <memory>
#include "caps.h"
namespace rokid {
  /*
   * 
   */
  class AwakeEffect {
  private:
    std::shared_ptr<std::string> wakeupId = nullptr;
    std::shared_ptr<std::string> voiceId = nullptr;
    std::shared_ptr<std::string> wakeupUrl = nullptr;
  public:
    inline static std::shared_ptr<AwakeEffect> create() {
      return std::make_shared<AwakeEffect>();
    }
    /*
    * getter wakeup id
    */
    inline const std::shared_ptr<std::string> getWakeupId() const {
      return wakeupId;
    }
    /*
    * getter voice id
    */
    inline const std::shared_ptr<std::string> getVoiceId() const {
      return voiceId;
    }
    /*
    * getter wav file path
    */
    inline const std::shared_ptr<std::string> getWakeupUrl() const {
      return wakeupUrl;
    }
    /*
    * setter wakeup id
    */
    inline void setWakeupId(const std::shared_ptr<std::string> &v) {
      wakeupId = v;
    }
    /*
    * setter wakeup id
    */
    inline void setWakeupId(const char* v) {
      if (!wakeupId)    wakeupId = std::make_shared<std::string>();  *wakeupId = v;
    }
    /*
    * setter voice id
    */
    inline void setVoiceId(const std::shared_ptr<std::string> &v) {
      voiceId = v;
    }
    /*
    * setter voice id
    */
    inline void setVoiceId(const char* v) {
      if (!voiceId)    voiceId = std::make_shared<std::string>();  *voiceId = v;
    }
    /*
    * setter wav file path
    */
    inline void setWakeupUrl(const std::shared_ptr<std::string> &v) {
      wakeupUrl = v;
    }
    /*
    * setter wav file path
    */
    inline void setWakeupUrl(const char* v) {
      if (!wakeupUrl)    wakeupUrl = std::make_shared<std::string>();  *wakeupUrl = v;
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
#endif // _AWAKEEFFECT_H