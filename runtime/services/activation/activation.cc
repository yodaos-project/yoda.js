#include <utility>
#include <list>
#include <mutex>
#include <thread>
#include <chrono>
#include <condition_variable>
#include <memory>
#include <string>
#include <string.h>
#include <iostream>
#include <stdio.h>
#include <time.h>
#include <stdlib.h>
#include <librplayer/WavPlayer.h>
#include <cutils/properties.h>
#include <vol_ctrl/volumecontrol.h>
#include "flora-cli.h"
#include "MessageCommon.h"

using namespace std;
using namespace flora;
using namespace rokid;

const char* filenames[] = {
        "/opt/media/awake_01.wav",
        "/opt/media/awake_02.wav",
        "/opt/media/awake_03.wav",
        "/opt/media/awake_04.wav",
        "/opt/media/awake_05.wav"
};
const char* VOICE_COMING = "rokid.turen.voice_coming";
const char* AWAKE_EFFECT = "rokid.activation.awake_effect";

class Activation : public ClientCallback {
public:
  Activation() {
    srand(time(NULL));
    filename_list = filenames;
    filename_list_size = sizeof(filenames);
    prePrepareWavPlayer(filename_list, filename_list_size);
    fprintf(stdout, "wav player has been preloaded all activation files\n");
  }
  // cppcheck-suppress unusedFunction
  void recv_post(const char* name, uint32_t msgtype, shared_ptr<Caps>& msg) {
    if (strcmp(VOICE_COMING, name) == 0) {
      playAwake();
    } else {
      applyAwakeEffect(msg);
    }
  }
  // cppcheck-suppress unusedFunction
  void disconnected() {
    thread tmp([this]() { this->flora_disconnected(); });
    tmp.detach();
  }
  void flora_disconnected() {
    flora_cli.reset();
    reconn_mutex.lock();
    reconn_cond.notify_one();
    reconn_mutex.unlock();
  }
  void start() {
    shared_ptr<Client> cli;
    unique_lock<mutex> locker(reconn_mutex);
    prepareForNextAwake();
    while (true) {
      int32_t r = Client::connect("unix:/var/run/flora.sock", this, 0, cli);
      if (r != FLORA_CLI_SUCCESS) {
        fprintf(stderr, "init flora client failed, please retry\n");
        reconn_cond.wait_for(locker, chrono::seconds(5));
      } else {
        cli->subscribe(VOICE_COMING);
        cli->subscribe(AWAKE_EFFECT);
        flora_cli = cli;
        reconn_cond.wait(locker);
      }
    }
  }

private:
  bool volume_set = false;
  shared_ptr<Client> flora_cli;
  mutex reconn_mutex;
  condition_variable reconn_cond;
  const char ** filename_list;
  size_t filename_list_size;
  bool is_default_open = true;
  bool is_custom_open = false;
  shared_ptr<vector<AwakeEffect>> awake_effect_list;

  void prepareForNextAwake() {
    int id = rand() % filename_list_size;
    prepareWavPlayer(filename_list[id], "system", true);
    if (!volume_set) {
      char val[PROP_VALUE_MAX];
      property_get("persist.audio.volume.system", (char*)&val, "");
      int vol = atoi(val);
      fprintf(stdout, "init activation volume to %d\n", vol);
      rk_set_stream_volume(STREAM_SYSTEM, vol);
      volume_set = true;
    }
  }
  void playAwake() {
    char is_awakeswitch_open[PROP_VALUE_MAX];
    property_get("persist.sys.awakeswitch", (char*)is_awakeswitch_open, "");
    if (strcmp(is_awakeswitch_open, "close") == 0) {
      fprintf(stdout, "awakeswitch is closed, just skip\n");
      return;
    }

    char network_is_available[PROP_VALUE_MAX];
    property_get("state.network.connected", (char*)network_is_available, "");
    if (strcmp(network_is_available, "true") != 0) {
      fprintf(stdout, "current network is not available, just skip\n");
      return;
    }
    startWavPlayer();
    prepareForNextAwake();
  }
  void applyAwakeEffect(shared_ptr<Caps> &msg) {
    auto t = get_msg_type(msg);
    if (t != MessageType::TYPE_CUSTOMAWAKEEFFECT)
      return;
    auto v = CustomAwakeEffect::create();
    if (v->serializeForCapsObj(msg) == CAPS_SUCCESS) {
      if (v->getType() == 0) { // 0: default 1: custom
        auto action = v->getAction();
        if (action && *action == "open") {
          is_default_open = true;
        } else if (action) {
          is_default_open = false;
        }
      } else if (v->getType() == 1) {
        auto action = v->getAction();
        if (action && *action == "open") {
          is_custom_open = true;
          auto awakeEffects = v->getValue();
          if (awakeEffects) {
            awake_effect_list = awakeEffects;
            for(AwakeEffect &effect : *awakeEffects) {

            }
          }
        } else if (action) {
          is_custom_open = false;
        }
      }
      filename_list = filenames;
      filename_list_size = 1;
      prePrepareWavPlayer(filename_list, filename_list_size);
      fprintf(stdout, "wav player has been preloaded all custom activation files\n");
    }
  }
};

int main(int argc, char** argv) {
  Activation activation;
  activation.start();
  return 1;
}

