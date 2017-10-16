#ifndef __RK_NATIVE_BASE_H__
#define __RK_NATIVE_BASE_H__

#include <iostream>

using namespace std;

class NativeBase {
public:
    NativeBase(const char*);
    NativeBase();
    ~NativeBase();

    virtual bool onCreate(const std::string& contex) = 0;
    virtual bool onRestart(const std::string& contex) = 0;
    virtual bool onRevival(const std::string& contex) = 0;
    virtual bool onResume() = 0;
    virtual bool onPause() = 0;
    virtual bool onStop() = 0;
    virtual bool onDestroy() = 0;
    virtual bool onRapture() = 0;
    virtual bool onEvent(const std::string& event) = 0;
    virtual bool onVoiceCommand(const std::string& asr, const std::string& nlp, const std::string& action) = 0;

public:
    void StartActivity(const std::string&, const std::string&);
    void SubFinish();
    void Finish();
    void OpenSiren(const bool);

public:
    void Enter(); 
    void Leave();

private:
    void *link;
};

#endif

