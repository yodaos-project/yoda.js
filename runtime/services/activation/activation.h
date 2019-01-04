#ifndef FRAMEWORKS_ACTIVATION_H
#define FRAMEWORKS_ACTIVATION_H

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

using namespace std;
using namespace flora;

class Activation : public ClientCallback {
public:
  Activation();
  void start();
private:
  bool volume_set = false;
  shared_ptr<Client> flora_cli;
  mutex reconn_mutex;
  condition_variable reconn_cond;
  std::vector<std::string> files_from_flora;
  bool is_open = false;

  void prepareForNextAwake();
  void playAwake();
  void applyAwakeSound(shared_ptr<Caps> &msg);
  // cppcheck-suppress unusedFunction
  void recv_post(const char* name, uint32_t msgtype, shared_ptr<Caps>& msg);
  void disconnected();
  void flora_disconnected();
  bool keep_alive = true;
};

#endif //FRAMEWORKS_ACTIVATION_H
