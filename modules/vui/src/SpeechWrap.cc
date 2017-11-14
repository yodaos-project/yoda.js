#include <stdio.h>
#include <stdlib.h>
#include <SpeechWrap.h>

using namespace v8;
using namespace std;

uv_mutex_t mutex;

enum VoiceEventType {
  VOICE_COMING = 0,
  VOICE_START,
  VOICE_ACCEPT,
  VOICE_REJECT,
  VOICE_CANCEL,
  VOICE_LOCAL_SLEEP,
};

/**
 * @class BaseMessage
 */
class BaseMessage {
 public:
  BaseMessage(SpeechWrap* speech, const int32_t id) : id(id) {
    speech_ = speech;
  }
  ~BaseMessage() {}
 public:
  SpeechWrap* speech_;
  const int32_t id;
};

/**
 * @class VoiceEventMessage
 * @extends BaseMessage
 */
class VoiceEventMessage : public BaseMessage {
 public:
  VoiceEventMessage(SpeechWrap* speech, const int32_t id) : BaseMessage(speech, id) {}
 public:
  string event;
  double sl;
  double energy;
};

/**
 * @class VoiceEventMessage
 * @extends BaseMessage
 */
class IntermediateMessage : public BaseMessage {
 public:
  IntermediateMessage(SpeechWrap* speech, const int32_t id) : BaseMessage(speech, id) {}
 public:
  int32_t type;
  string asr;
};

/**
 * @class VoiceCommandMessage
 * @extends BaseMessage
 */
class VoiceCommandMessage : public BaseMessage {
 public:
  VoiceCommandMessage(SpeechWrap* speech, const int32_t id) : BaseMessage(speech, id) {}
 public:
  string asr;
  string nlp;
  string action;
};

/**
 * @class SpeechErrorMessage
 * @extends BaseMessage
 */
class SpeechErrorMessage : public BaseMessage {
 public:
  SpeechErrorMessage(SpeechWrap* speech, const int32_t id) : BaseMessage(speech, id) {}
 public:
  int32_t code;
};

/**
 * @class VoiceCallback
 * @extends BnVoiceCallback
 */
class VoiceCallback : public BnVoiceCallback {
 private:
  SpeechWrap* speech_;

 public:
  /**
   * @constructor
   * @param {SpeechWrap*} speech
   */
  VoiceCallback(SpeechWrap* speech) {
    speech_ = speech;
  }
  /**
   * @method voice_event
   */
  inline void voice_event(const int32_t id, const int32_t event, const double sl, const double energy) {
    uv_async_t* async = new uv_async_t;
    VoiceEventMessage* msg = new VoiceEventMessage(speech_, id);
    msg->sl = sl;
    msg->energy = energy;
    switch (event) {
      case VOICE_COMING:
        msg->event = "coming";
        break;
      case VOICE_START:
        msg->event = "start";
        break;
      case VOICE_ACCEPT:
        msg->event = "accept";
        break;
      case VOICE_REJECT:
        msg->event = "reject";
        break;
      case VOICE_CANCEL:
        msg->event = "cancel";
        break;
      case VOICE_LOCAL_SLEEP:
        msg->event = "local sleep";
        break;
      default:
        break;
    }

    async->data = (void*)msg;
    uv_mutex_lock(&mutex);
    uv_async_init(uv_default_loop(), async, SpeechWrap::OnVoiceEvent);
    uv_async_send(async);
    uv_mutex_unlock(&mutex);
  }
  /**
   * @method intermediate_result
   */
  inline void intermediate_result(const int32_t id, const int32_t type, const string& asr) {
    uv_async_t* async = new uv_async_t;
    IntermediateMessage* msg = new IntermediateMessage(speech_, id);
    msg->type = type;
    msg->asr = asr;
    
    async->data = (void*)msg;
    uv_mutex_lock(&mutex);
    uv_async_init(uv_default_loop(), async, SpeechWrap::OnIntermediateResult);
    uv_async_send(async);
    uv_mutex_unlock(&mutex);
  }
  /**
   * @method voice_command
   */
  inline void voice_command(const int32_t id, const string& asr, const string& nlp, const string& action) {
    uv_async_t* async = new uv_async_t;
    VoiceCommandMessage* msg = new VoiceCommandMessage(speech_, id);
    msg->asr = asr;
    msg->nlp = nlp;
    msg->action = action;

    async->data = (void*)msg;
    uv_mutex_lock(&mutex);
    uv_async_init(uv_default_loop(), async, SpeechWrap::OnVoiceCommand);
    uv_async_send(async);
    uv_mutex_unlock(&mutex);
  }
  /**
   * @method speech_error
   */
  inline void speech_error(const int32_t id, const int32_t code) {
    uv_async_t* async = new uv_async_t;
    SpeechErrorMessage* msg = new SpeechErrorMessage(speech_, id);
    msg->code = code;

    async->data = (void*)msg;
    uv_mutex_lock(&mutex);
    uv_async_init(uv_default_loop(), async, SpeechWrap::OnError);
    uv_async_send(async);
    uv_mutex_unlock(&mutex);
  }
};

SpeechWrap::SpeechWrap() {
  _handle = interface_cast<IVoiceService>(
    defaultServiceManager()->getService(String16("openvoice_process")));
  _voiceCb = new VoiceCallback(this);
}

SpeechWrap::~SpeechWrap() {
  // uv_mutex_destroy(&async_locker);
}

void SpeechWrap::OnVoiceEvent(uv_async_t* handle) {
  VoiceEventMessage* msg = (VoiceEventMessage*)handle->data;
  Nan::HandleScope scope;
  Local<Value> argv[4];
  argv[0] = Nan::New<Number>(msg->id);
  argv[1] = Nan::New<String>(msg->event).ToLocalChecked();
  argv[2] = Nan::New<Number>(msg->sl);
  argv[3] = Nan::New<Number>(msg->energy);

  MaybeLocal<String> key = Nan::New<String>("onVoiceEvent");
  Local<Value> val = Nan::Get(msg->speech_->handle(), key.ToLocalChecked()).ToLocalChecked();
  if (val->IsFunction()) {
    Nan::Callback* callback = new Nan::Callback(val.As<Function>());
    callback->Call(4, argv);
  }
  uv_close((uv_handle_t*) handle, SpeechWrap::AfterCloseAsync);
  delete msg;
}

void SpeechWrap::OnIntermediateResult(uv_async_t* handle) {
  IntermediateMessage* msg = (IntermediateMessage*)handle->data;
  Nan::HandleScope scope;
  Local<Value> argv[3];
  argv[0] = Nan::New<Number>(msg->id);
  argv[1] = Nan::New<Number>(msg->type);
  argv[2] = Nan::New<String>(msg->asr.c_str()).ToLocalChecked();

  MaybeLocal<String> key = Nan::New<String>("onIntermediateResult");
  Local<Value> val = Nan::Get(msg->speech_->handle(), key.ToLocalChecked()).ToLocalChecked();
  if (val->IsFunction()) {
    Nan::Callback* callback = new Nan::Callback(val.As<Function>());
    callback->Call(3, argv);
  }
  uv_close((uv_handle_t*) handle, SpeechWrap::AfterCloseAsync);
  delete msg;
}

void SpeechWrap::OnVoiceCommand(uv_async_t* handle) {
  VoiceCommandMessage* msg = (VoiceCommandMessage*)handle->data;
  Nan::HandleScope scope;
  Local<Value> argv[4];
  argv[0] = Nan::New<Number>(msg->id);
  argv[1] = Nan::New<String>(msg->asr).ToLocalChecked();
  argv[2] = Nan::New<String>(msg->nlp).ToLocalChecked();
  argv[3] = Nan::New<String>(msg->action).ToLocalChecked();

  MaybeLocal<String> key = Nan::New<String>("onVoiceCommand");
  Local<Value> val = Nan::Get(msg->speech_->handle(), key.ToLocalChecked()).ToLocalChecked();
  if (val->IsFunction()) {
    Nan::Callback* callback = new Nan::Callback(val.As<Function>());
    callback->Call(4, argv);
  }
  uv_close((uv_handle_t*) handle, SpeechWrap::AfterCloseAsync);
  delete msg;
}

void SpeechWrap::OnError(uv_async_t* handle) {
  SpeechErrorMessage* msg = (SpeechErrorMessage*)handle->data;
  Nan::HandleScope scope;
  Local<Value> argv[2];
  argv[0] = Nan::New<Number>(msg->id);
  argv[1] = Nan::New<Number>(msg->code);

  MaybeLocal<String> key = Nan::New<String>("onError");
  Local<Value> val = Nan::Get(msg->speech_->handle(), key.ToLocalChecked()).ToLocalChecked();
  if (val->IsFunction()) {
    Nan::Callback* callback = new Nan::Callback(val.As<Function>());
    callback->Call(4, argv);
  }
  uv_close((uv_handle_t*) handle, SpeechWrap::AfterCloseAsync);
  delete msg;
}

NAN_MODULE_INIT(SpeechWrap::Init) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("SpeechWrap").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  Nan::SetPrototypeMethod(tpl, "start", Start);
  Nan::SetPrototypeMethod(tpl, "pause", Pause);
  Nan::SetPrototypeMethod(tpl, "resume", Resume);
  Nan::SetPrototypeMethod(tpl, "updateStack", UpdateStack);
  Nan::SetPrototypeMethod(tpl, "setSirenState", SetSirenState);

  Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
  Nan::Set(target, Nan::New("SpeechWrap").ToLocalChecked(), func);
  uv_mutex_init(&mutex);
}

NAN_METHOD(SpeechWrap::New) {
  SpeechWrap* speech = new SpeechWrap();
  speech->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(SpeechWrap::Start) {
  SpeechWrap* speech = Nan::ObjectWrap::Unwrap<SpeechWrap>(info.This());
  if (speech->_handle != NULL) {
    speech->_handle->init();
    speech->_handle->network_state_change(1);
    speech->_handle->regist_callback(speech->_voiceCb);
    ProcessState::self()->startThreadPool();
  }
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(SpeechWrap::Resume) {
  SpeechWrap* speech = Nan::ObjectWrap::Unwrap<SpeechWrap>(info.This());
  speech->_handle->start_siren(true);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(SpeechWrap::Pause) {
  SpeechWrap* speech = Nan::ObjectWrap::Unwrap<SpeechWrap>(info.This());
  speech->_handle->start_siren(false);
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(SpeechWrap::UpdateStack) {
  SpeechWrap* speech = Nan::ObjectWrap::Unwrap<SpeechWrap>(info.This());
  String::Utf8Value appid(info[0]->ToString());
  speech->_handle->update_stack(std::string(*appid));
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(SpeechWrap::SetSirenState) {
  SpeechWrap* speech = Nan::ObjectWrap::Unwrap<SpeechWrap>(info.This());
  speech->_handle->set_siren_state(info[0]->Int32Value());
  info.GetReturnValue().Set(info.This());
}

void InitModule(Handle<Object> target) {
  SpeechWrap::Init(target);
}

NODE_MODULE(speech_down, InitModule);
