#include "media-player.h"
#include "rklog/RKLog.h"

using namespace std;

// Initialize native add-on
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  MediaPlayerWrap::Init(env, exports);
  return exports;
}

// Register and initialize native add-on
NODE_API_MODULE(MediaPlayer, Init);

static void media_player_event_callback(napi_env env, napi_value js_callback,
                                        void* context, void* data) {
  RKLogv("media_player_event_callback");
  MediaPlayerWrap* wrap = static_cast<MediaPlayerWrap*>(context);
  wrap->onevent(Napi::Function(env, js_callback),
                static_cast<MediaPlayerEvent*>(data));
}

static void media_player_finalize(napi_env env, void* finalize_data,
                                  void* finalize_hint) {
}

Napi::Object MediaPlayerWrap::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function ctor =
      DefineClass(env, "MediaPlayer",
                  { InstanceMethod("setup", &MediaPlayerWrap::setup),
                    InstanceMethod("setDataSource",
                                   &MediaPlayerWrap::setDataSource),
                    InstanceMethod("prepare", &MediaPlayerWrap::prepare),
                    InstanceMethod("start", &MediaPlayerWrap::start),
                    InstanceMethod("stop", &MediaPlayerWrap::stop),
                    InstanceMethod("pause", &MediaPlayerWrap::pause),
                    InstanceMethod("seekTo", &MediaPlayerWrap::seekTo),
                    InstanceMethod("reset", &MediaPlayerWrap::reset),
                    InstanceMethod("getAudioSessionId",
                                   &MediaPlayerWrap::getAudioSessionId),
                    InstanceMethod("setAudioSessionId",
                                   &MediaPlayerWrap::setAudioSessionId),
                    InstanceMethod("getDuration",
                                   &MediaPlayerWrap::getDuration),
                    InstanceMethod("getPosition",
                                   &MediaPlayerWrap::getPosition),
                    InstanceMethod("getPlaying", &MediaPlayerWrap::getPlaying),
                    InstanceMethod("getLooping", &MediaPlayerWrap::getLooping),
                    InstanceMethod("setLooping", &MediaPlayerWrap::setLooping),
                    InstanceMethod("setTempoDelta",
                                   &MediaPlayerWrap::setTempoDelta),
                    InstanceMethod("getVolume", &MediaPlayerWrap::getVolume),
                    InstanceMethod("setVolume", &MediaPlayerWrap::setVolume) });
  exports.Set("MediaPlayer", ctor);
  return exports;
}

MediaPlayerWrap::MediaPlayerWrap(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<MediaPlayerWrap>(info) {
}

MediaPlayerWrap::~MediaPlayerWrap() {
  teardown();
}

Napi::Value MediaPlayerWrap::setup(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (player != nullptr) {
    Napi::Error::New(env, "Conflict opening").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  char* tag = nullptr;
  double cacheDuration = 5;
  if (info[0].IsString()) {
    auto tag_str = info[0].As<Napi::String>().Utf8Value();
    tag = tag_str.c_str();
  }
  if (info[1].IsNumber()) {
    cacheDuration = info[1].As<Napi::Number>().DoubleValue();
  }
  if (!info[2].IsFunction()) {
    Napi::TypeError::New(env, "Expect a function on third argument of open")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  player = new MediaPlayer(tag, cacheDuration, cacheDuration != 0);
  player->setListener(this);

  napi_create_threadsafe_function(env, info[2].As<Napi::Function>(),
                                  env.Undefined(), env.Undefined(),
                                  /** max queue */ 5, /** initial_ref */ 0,
                                  /** finalize data */ nullptr,
                                  media_player_finalize,
                                  /** context */ this,
                                  /** call_js */ media_player_event_callback,
                                  &this->tsfn);
  napi_unref_threadsafe_function(env, tsfn);

  return env.Undefined();
}

void MediaPlayerWrap::teardown() {
  if (player == nullptr) {
    return;
  }
  RKLogv("tear down player");
  napi_release_threadsafe_function(tsfn, napi_tsfn_release);
  delete this->player;
  this->player = nullptr;
#if defined(__GLIBC__)
  malloc_trim(0);
#endif // defined(__GLIBC__)
}

bool MediaPlayerWrap::guardPlayer(Napi::Env env, bool shouldPrepared) {
  if (player == nullptr) {
    Napi::Error::New(env, "MediaPlayerWrap has not been set up.")
        .ThrowAsJavaScriptException();
    return true;
  }
  return false;
}

bool MediaPlayerWrap::guardStatus(Napi::Env env, status_t status) {
  if (status != 0) {
    char msg[100];
    snprintf(msg, 100, "Unexpected player status code %d", status);
    Napi::Error::New(env, msg).ThrowAsJavaScriptException();
    return true;
  }
  return false;
}

Napi::Value MediaPlayerWrap::setDataSource(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "Expect a string of data source")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  auto url = info[0].As<Napi::String>().Utf8Value();
  auto status = player->setDataSource(url.c_str());
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::prepare(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  napi_ref_threadsafe_function(env, tsfn);
  napi_acquire_threadsafe_function(tsfn);

  auto status = player->prepareAsync();
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::start(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env, true)) {
    return env.Undefined();
  }
  auto status = player->start();
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::stop(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (player == nullptr) {
    return env.Undefined();
  }
  auto status = player->stop();

  /** synchronous stop */
  RKLogv("on stop, releasing player");
  teardown();

  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::pause(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env, true)) {
    return env.Undefined();
  }
  auto status = player->pause();
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::seekTo(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env, true)) {
    return env.Undefined();
  }
  if (!info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected a number on 'seekTo'")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  int msec = info[0].As<Napi::Number>().Int32Value();
  auto status = player->seekTo(msec);
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::reset(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (player == nullptr) {
    return env.Undefined();
  }
  player->reset();
  return env.Undefined();
}


Napi::Value MediaPlayerWrap::getAudioSessionId(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  int as = player->getAudioSessionId();
  return Napi::Number::New(env, as);
}

Napi::Value MediaPlayerWrap::setAudioSessionId(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  int as = info[0].As<Napi::Number>().Int32Value();
  auto status = player->setAudioSessionId(as);
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::getDuration(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  int msec = 0;
  auto status = player->getDuration(&msec);
  guardStatus(env, status);
  return Napi::Number::New(env, msec);
}

Napi::Value MediaPlayerWrap::getPosition(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  int msec = 0;
  auto status = player->getCurrentPosition(&msec);
  guardStatus(env, status);
  return Napi::Number::New(env, msec);
}

Napi::Value MediaPlayerWrap::getPlaying(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  bool playing = player->isPlaying();
  return Napi::Boolean::New(env, playing);
}

Napi::Value MediaPlayerWrap::getLooping(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  bool looping = player->isLooping();
  return Napi::Boolean::New(env, looping);
}

Napi::Value MediaPlayerWrap::setLooping(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  bool looping = info[0].As<Napi::Boolean>().Value();
  auto status = player->setLooping(looping);
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::setTempoDelta(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  float delta = info[0].As<Napi::Number>().FloatValue();
  auto status = player->setTempoDelta(delta);
  guardStatus(env, status);
  return env.Undefined();
}

Napi::Value MediaPlayerWrap::getVolume(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  int vol = player->getVolume();
  return Napi::Number::New(env, vol);
}

Napi::Value MediaPlayerWrap::setVolume(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  if (guardPlayer(env)) {
    return env.Undefined();
  }
  int vol = info[0].As<Napi::Number>().Int32Value();
  /** ret code is vol */ player->setVolume(vol);
  return env.Undefined();
}

void MediaPlayerWrap::notify(int type, int ext1, int ext2, int from) {
  MediaPlayerEvent* ptr = new MediaPlayerEvent(type, ext1, ext2, from);
  napi_call_threadsafe_function(tsfn, (void*)ptr, napi_tsfn_blocking);
}

void MediaPlayerWrap::onevent(Napi::Function fn, MediaPlayerEvent* eve) {
  auto env = fn.Env();
  RKLogv("on event(%d) calling js", eve->type);

  if (eve->type == MEDIA_STOPED || eve->type == MEDIA_ERROR) {
    RKLogv("on terminal event, releasing player");
    teardown();
  }

  RKLogv("calling js for event(%d)", eve->type);
  fn.Call(
      { Napi::Number::New(env, eve->type), Napi::Number::New(env, eve->ext1),
        Napi::Number::New(env, eve->ext2), Napi::Number::New(env, eve->from) });
  RKLogv("event(%d) fired", eve->type);
}
