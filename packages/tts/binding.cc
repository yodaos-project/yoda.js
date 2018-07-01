#include <stdlib.h>
#include <stdio.h>
#include <shadow-node/iotjs.h>
#include <shadow-node/iotjs_def.h>
#include <shadow-node/iotjs_binding.h>
#include <speech/tts.h>

using namespace std;
using namespace rokid;
using namespace speech;

#ifdef __cplusplus
extern "C" {
#endif

JS_FUNCTION(Prepare) {
  return jerry_create_boolean(true);
}

JS_FUNCTION(Speak) {
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "prepare", Prepare);
  iotjs_jval_set_method(exports, "speak", Speak);
}

NODE_MODULE(tts, init)

#ifdef __cplusplus
} // closing brace for extern "C"
#endif
