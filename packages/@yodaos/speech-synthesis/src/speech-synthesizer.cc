#include "speech-synthesizer.h"
#include "pulse/simple.h"

#define LOG_TAG "SpeechSynthesizer"
#include "logger.h"

using namespace Napi;

// Initialize native add-on
Object Init(Env env, Object exports) {
  SpeechSynthesizer::Init(env, exports);
  return exports;
}

// Register and initialize native add-on
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);

static void speech_synthesis_event_callback(napi_env env,
                                            napi_value js_callback,
                                            void* context, void* data) {
  RKLogv("on event callback(%d)", (int)(uintptr_t)data);
  SpeechSynthesizer* synth = static_cast<SpeechSynthesizer*>(context);
  synth->onevent(Napi::Function(env, js_callback), data);
}

static void speech_synthsis_finalize(napi_env env, void* finalize_data,
                                     void* finalize_hint) {
}

Object SpeechSynthesizer::Init(Napi::Env env, Object exports) {
  Function ctor =
      DefineClass(env, "SpeechSynthesizer",
                  { InstanceMethod("setup", &SpeechSynthesizer::setup),
                    InstanceMethod("teardown", &SpeechSynthesizer::teardown),
                    InstanceMethod("speak", &SpeechSynthesizer::speak),
                    InstanceMethod("playStream",
                                   &SpeechSynthesizer::playStream),
                    InstanceMethod("cancel", &SpeechSynthesizer::cancel) });
  exports.Set("SpeechSynthesizer", ctor);
  return exports;
}

SpeechSynthesizer::SpeechSynthesizer(const CallbackInfo& info)
    : ObjectWrap<SpeechSynthesizer>(info) {
}

SpeechSynthesizer::~SpeechSynthesizer() {
}

Value SpeechSynthesizer::setup(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto status = napi_create_threadsafe_function(
      env, info[0].As<Function>(), env.Undefined(), env.Undefined(),
      /** max_queue */ 5, /** initial_ref */ 1,
      /** finalize_data */ nullptr, /** finalize_cb */ speech_synthsis_finalize,
      /** context*/ this, /** js_callback */ speech_synthesis_event_callback,
      &this->tsfn);
  if (status != napi_ok) {
    Error::New(env, "Unexpected error on creating threadsafe function.")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  /** allow process to exit while there is no active SpeechSynthesis requests */
  napi_unref_threadsafe_function(env, this->tsfn);

  floraAgent.config(FLORA_AGENT_CONFIG_URI, "unix:/var/run/flora.sock");
  floraAgent.start();
  conn_status |= CONN_STATUS_STARTED;

  return env.Undefined();
}

Value SpeechSynthesizer::teardown(const CallbackInfo& info) {
  auto env = info.Env();
  floraAgent.close();
  napi_ref_threadsafe_function(env, this->tsfn);
  napi_release_threadsafe_function(this->tsfn, napi_tsfn_abort);
  return env.Undefined();
}

/**
 *
 * @args[0]: utterance
 */
Value SpeechSynthesizer::speak(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (this->player != nullptr) {
    Error::New(env, "SpeechSynthesizer was busy").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  if (info.Length() < 1 || !info[0].IsObject()) {
    TypeError::New(env,
                   "Utterance Object was expected on SpeechSynthesizer.speak")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Object utter = info[0].As<Object>();
  auto id = utter.Get("id").As<String>().Utf8Value();
  auto text = utter.Get("text").As<String>().Utf8Value();

  /**
   * prevent process from exit while there are active SpeechSynthesis requests
   */
  napi_ref_threadsafe_function(env, this->tsfn);
  this->errCode = 0;

  pa_sample_spec ss;
  ss.format = PA_SAMPLE_S16NE;
  ss.channels = 1;
  ss.rate = 24000;
  this->player = new PcmPlayer([this](PcmPlayerEvent eve) {
    RKLogv("on player event(%d)", eve);
    napi_call_threadsafe_function(this->tsfn, (void*)(uintptr_t)eve,
                                  napi_tsfn_blocking);
  });
  this->player->init(ss);

  this->id = id;
  this->floraAgent.subscribe(id.c_str(),
                             [this](const char* name,
                                    std::shared_ptr<Caps>& msg, uint32_t type) {
                               int32_t status = 0;
                               msg->read(status);
                               if (status > 0) {
                                 RKLogv("end(%d)", status);
                                 this->player->end();
                                 this->floraAgent.unsubscribe(this->id.c_str());
                                 return;
                               }

                               std::vector<uint8_t> data;
                               msg->read(data);
                               RKLogv("write data(%zu)", data.size());
                               this->player->write(data);
                             });
  std::shared_ptr<Caps> msg = Caps::new_instance();
  msg->write(id);
  msg->write(text);
  this->floraAgent.call(
      YODAOS_SPEECH_SYNTHESIS_IPC_SPEAK, msg,
      YODAOS_SPEECH_SYNTHESIS_IPC_TARGET,
      [this](int32_t resCode, flora::Response& resp) {
        if (resCode != 0) {
          this->errCode = resCode;
          this->player->cancel();
        }
      },
      10 * 1000);
  return env.Undefined();
}

Value SpeechSynthesizer::cancel(const CallbackInfo& info) {
  auto env = info.Env();
  if (this->player == nullptr) {
    return env.Undefined();
  }
  this->floraAgent.unsubscribe(this->id.c_str());
  this->player->cancel();
  return env.Undefined();
}

/**
 *
 * @args[0]: id
 */
Value SpeechSynthesizer::playStream(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (this->player != nullptr) {
    Error::New(env, "SpeechSynthesizer was busy").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  if (info.Length() < 1 || !info[0].IsObject()) {
    TypeError::New(env,
                   "Utterance Object was expected on SpeechSynthesizer.speak")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Object utter = info[0].As<Object>();
  auto id = utter.Get("id").As<String>().Utf8Value();

  /**
   * prevent process from exit while there are active SpeechSynthesis requests
   */
  napi_ref_threadsafe_function(env, this->tsfn);
  this->errCode = 0;

  pa_sample_spec ss;
  ss.format = PA_SAMPLE_S16NE;
  ss.channels = 1;
  ss.rate = 24000;
  this->player = new PcmPlayer([this](PcmPlayerEvent eve) {
    napi_call_threadsafe_function(this->tsfn, (void*)(uintptr_t)eve,
                                  napi_tsfn_blocking);
  });
  this->player->init(ss);

  this->id = id;
  this->floraAgent.subscribe(id.c_str(),
                             [this](const char* name,
                                    std::shared_ptr<Caps>& msg, uint32_t type) {
                               int32_t status = 0;
                               msg->read(status);
                               if (status > 0) {
                                 this->player->end();
                                 this->floraAgent.unsubscribe(this->id.c_str());
                                 return;
                               }
                               std::vector<uint8_t> data;
                               msg->read(data);
                               this->player->write(data);
                             });
  return env.Undefined();
}

void SpeechSynthesizer::onevent(Napi::Function fn, void* data) {
  auto env = fn.Env();
  PcmPlayerEvent eve = (PcmPlayerEvent)(uintptr_t)data;
  RKLogv("on event(%d) calling js", eve);

  if (eve > 0) {
    /**
     * allow process to exit while there is no active SpeechSynthesis requests
     */
    napi_unref_threadsafe_function(env, this->tsfn);
    delete this->player;
    this->player = nullptr;
  }

  RKLogv("calling js for Event(%d)", eve);
  fn.Call({ Number::New(env, (uintptr_t)data), Number::New(env, errCode) });
  RKLogv("Event(%d) fired", eve);
}
