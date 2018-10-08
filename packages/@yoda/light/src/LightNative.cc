#include "LightNative.h"
#include <lumenflinger/LumenLight.h>
#include <errno.h>

LumenLight light;
char* frame = NULL;
int ledCount = 0;
int ledBit = 3;

JS_FUNCTION(Enable) {
  light.lumen_set_enable(true);
  ledCount = light.m_ledCount;
  ledBit = light.m_pixelFormat;
  if (ledCount <= 0) {
    return JS_CREATE_ERROR(RANGE, "Can't get the number of leds");
  }
  frame = new char[ledCount * ledBit];
  return jerry_create_boolean(true);
}

JS_FUNCTION(Disable) {
  light.lumen_set_enable(false);
  delete frame;
  return jerry_create_boolean(true);
}

JS_FUNCTION(Write) {
  iotjs_bufferwrap_t* buffer = iotjs_bufferwrap_from_jbuffer(jargv[0]);
  int srclen = (int)iotjs_bufferwrap_length(buffer);
  unsigned char* bytes = (unsigned char*)iotjs_bufferwrap_buffer(buffer);
  int r = light.lumen_draw(bytes, srclen + 1);
  if (r != 0) {
    fprintf(stderr, "lumen_draw failed, it returns %d, (%d)%s\n", r, errno,
            strerror(errno));
  }
  return jerry_create_number(r);
}

JS_FUNCTION(Render) {
  if (NULL == frame) {
    return JS_CREATE_ERROR(COMMON,
                           "LumenLight is disabled, please enable first")
  }
  int r = light.lumen_draw((unsigned char*)frame, ledCount * ledBit);
  if (r != 0) {
    fprintf(stderr, "lumen_draw failed, it returns %d, (%d)%s\n", r, errno,
            strerror(errno));
  }
  return jerry_create_number(r);
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

/*
 * boolean pixel(pos, r, g, b)
 */
JS_FUNCTION(Pixel) {
  if (NULL == frame) {
    return JS_CREATE_ERROR(COMMON,
                           "LumenLight is disabled, please enable first")
  }
  int pos = jerry_get_number_value(jargv[0]);
  if (pos >= ledCount || pos < 0) {
    return JS_CREATE_ERROR(RANGE, "The position of the led is out of range");
  }
  pos = pos * ledBit;
  int r = jerry_get_number_value(jargv[1]);
  int g = jerry_get_number_value(jargv[2]);
  int b = jerry_get_number_value(jargv[3]);
  frame[pos] = r;
  frame[pos + 1] = g;
  frame[pos + 2] = b;
  return jerry_create_undefined();
}

JS_FUNCTION(Fill) {
  if (NULL == frame) {
    return JS_CREATE_ERROR(COMMON,
                           "LumenLight is disabled, please enable first")
  }
  int r = jerry_get_number_value(jargv[0]);
  int g = jerry_get_number_value(jargv[1]);
  int b = jerry_get_number_value(jargv[2]);
  int pos = 0;
  for (int i = 0; i < ledCount; i++) {
    pos = i * ledBit;
    frame[pos] = r;
    frame[pos + 1] = g;
    frame[pos + 2] = b;
  }
  return jerry_create_undefined();
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "enable", Enable);
  iotjs_jval_set_method(exports, "disable", Disable);
  iotjs_jval_set_method(exports, "getProfile", GetProfile);
  iotjs_jval_set_method(exports, "write", Write);
  iotjs_jval_set_method(exports, "render", Render);
  iotjs_jval_set_method(exports, "pixel", Pixel);
  iotjs_jval_set_method(exports, "fill", Fill);
}

NODE_MODULE(light, init)
