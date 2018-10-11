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
#include <wavPlayer.h>
#include <cutils/properties.h>
#include <vol_ctrl/volumecontrol.h>
#include "flora-cli.h"

using namespace std;
using namespace flora;

const char* filenames[] = {
  "/opt/media/awake_01.wav",
  "/opt/media/awake_02.wav",
  "/opt/media/awake_03.wav",
  "/opt/media/awake_04.wav",
  "/opt/media/awake_05.wav"
};

class Activation : public ClientCallback {
 public:
  void recv_post(const char* name, uint32_t msgtype, shared_ptr<Caps>& msg) {
    char is_awakeswitch_open[PROP_VALUE_MAX];
    property_get("persist.sys.awakeswitch", (char*)is_awakeswitch_open, "");
    if (strcmp(is_awakeswitch_open, "close") != 0) {
      fprintf(stdout, "awakeswitch is closed, just skip\n");
      return;
    }

    char network_is_available[PROP_VALUE_MAX];
    property_get("state.network.connected", (char*)network_is_available, "");
    if (strcmp(network_is_available, "true") != 0) {
      fprintf(stdout, "current network is not available, just skip\n");
      return;
    }

    int id = rand() % 4;
    prepareWavPlayer(filenames[id], "system", true);
    if (volume_set != true) {
      char val[PROP_VALUE_MAX];
      property_get("persist.audio.volume.system", (char*)&val, "");
      int vol = atoi(val);
      fprintf(stdout, "init activation volume to %d\n", vol);
      rk_set_stream_volume(STREAM_SYSTEM, vol);
      volume_set = true;
    }
    startWavPlayer();
  }
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
    int32_t r;
    shared_ptr<Client> cli;
    unique_lock<mutex> locker(reconn_mutex);

    while (true) {
      r = Client::connect("unix:/var/run/flora.sock", this, 0, cli);
      if (r != FLORA_CLI_SUCCESS) {
        fprintf(stderr, "init flora client failed, please retry\n");
        reconn_cond.wait_for(locker, chrono::seconds(5));
      } else {
        cli->subscribe("rokid.turen.voice_coming", FLORA_MSGTYPE_INSTANT);
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
};

int main(int argc, char** argv) {
  srand(time(NULL));
  prePrepareWavPlayer(filenames, 4);
  fprintf(stdout, "wav player has been preloaded all activation files\n");

  Activation activation;
  activation.start();
  return 1;
}

