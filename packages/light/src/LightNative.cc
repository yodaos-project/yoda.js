#include "LightNative.h"
#include <lumenflinger/LumenLight.h>

using namespace android;
LumenLight light;

JS_FUNCTION(Enable) {
  light.lumen_set_enable(true);
  return jerry_create_boolean(true);
}

JS_FUNCTION(Disable) {
  light.lumen_set_enable(false);
  return jerry_create_boolean(true);
}

JS_FUNCTION(Write) {
  iotjs_bufferwrap_t* buffer = iotjs_bufferwrap_from_jbuffer(jargv[0]);
  int srclen = (int)iotjs_bufferwrap_length(buffer);
  unsigned char* bytes = (unsigned char*)iotjs_bufferwrap_buffer(buffer);
  int r = light.lumen_draw(bytes, srclen + 1);
  if (r != 0) {
    return JS_CREATE_ERROR(COMMON, "light value write error");
  }
  return jerry_create_boolean(true);
}

JS_FUNCTION(GetProfile) {
  jerry_value_t profile = jerry_create_object();
  iotjs_jval_set_property_number(profile, "leds", light.m_ledCount);
  iotjs_jval_set_property_number(profile, "format", light.m_pixelFormat);
  iotjs_jval_set_property_number(profile, "maximumFps", light.m_fps);
#ifdef MIC_ANGLE_DEVIATION
  iotjs_jval_set_property_number(profile, "micAngle", MIC_ANGLE_DEVIATION);
#else
  iotjs_jval_set_property_number(profile, "micAngle", 0);
#endif
  return profile;
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "enable", Enable);
  iotjs_jval_set_method(exports, "disable", Disable);
  iotjs_jval_set_method(exports, "getProfile", GetProfile);
  iotjs_jval_set_method(exports, "write", Write);
}

NODE_MODULE(light, init)

