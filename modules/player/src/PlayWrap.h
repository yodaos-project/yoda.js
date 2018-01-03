#pragma once

#include <node.h>
#include <nan.h>
#include <mediaplayer.h>

using namespace v8;
using namespace std;

class PlayWrap 
: public Nan::ObjectWrap, 
  public MediaPlayerListener {

public:
  static NAN_MODULE_INIT(Init);
  Nan::Callback* callback;
  uv_async_t async;

  int msg;
  volatile int destroyed = 0;
  void notify(int msg, int ext1, int ext2, int from);
  void destroy();

private:
  explicit PlayWrap();
  explicit PlayWrap(const char* type);
  ~PlayWrap();

  // instance methods
  static NAN_METHOD(New);
  static NAN_METHOD(SetDataSource);
  static NAN_METHOD(Start);
  static NAN_METHOD(Stop);
  static NAN_METHOD(Pause);
  static NAN_METHOD(Resume);
  static NAN_METHOD(Seek);

  // getters
  static NAN_PROPERTY_GETTER(IsPlaying);
  static NAN_PROPERTY_GETTER(Offset);
  static NAN_PROPERTY_GETTER(Duration);

  MediaPlayer* mPlayer;
};
