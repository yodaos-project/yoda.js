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

  vector<string> files;
  const char *filename_list[10];
  bool is_open = true;
  size_t filename_list_size;
  string default_path = "/opt/media/activation/";
  string custom_path = "/data/activation/media/";

  void prepareForNextAwake();
  void playAwake();
  void applyAwakeEffect(shared_ptr<Caps> &msg);
  void initPath();
  vector<string> getFiles(const string &path);
  void refreshFileList();
  // cppcheck-suppress unusedFunction
  void recv_post(const char* name, uint32_t msgtype, shared_ptr<Caps>& msg);
  void disconnected();
  void flora_disconnected();
};

#endif //FRAMEWORKS_ACTIVATION_H
