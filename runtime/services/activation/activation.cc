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
#include "flora-cli.h"

using namespace std;
using namespace flora;

const char* key = "state.network.connected";
const char* filenames[] = {
  "/opt/media/awake_01.wav",
  "/opt/media/awake_02.wav",
  "/opt/media/awake_03.wav",
  "/opt/media/awake_04.wav"
};

class Activation : public ClientCallback {
 public:
  void recv_post(const char* name, uint32_t msgtype, shared_ptr<Caps>& msg) {
    char network_is_available[PROP_VALUE_MAX];
    property_get(key, (char*)network_is_available, "");

    if (strcmp(network_is_available, "true") != 0) {
      fprintf(stdout, "current network is not available, just skip voice coming\n");
      return;
    } else {
      int id = rand() % 4;
      prepareWavPlayer(filenames[id], "system", true);
      startWavPlayer();
    }
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

