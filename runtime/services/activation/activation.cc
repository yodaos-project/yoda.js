#include "activation.h"
#include <sys/types.h>
#include <dirent.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fstream>
#include <sstream>

using namespace std;
using namespace flora;

const char* VOICE_COMING = "rokid.turen.voice_coming";
const char* PLAY = "rokid.activation.play";
const char* WAKEUP_SOUND = "rokid.custom_config.wakeup_sound";

const int32_t FILE_MAX_SIZE = 20 * 1024;
const int32_t MAX_PLAY_LIST = 10;

Activation::Activation() {
  srand(time(NULL));
  char propValue[PROP_VALUE_MAX];
  property_get("persist.player.awake.holdcon", (char*)propValue, "");
  if (strcmp(propValue, "0") == 0) {
    keep_alive = false;
  }
}

// cppcheck-suppress unusedFunction
void Activation::recv_post(const char* name, uint32_t msgtype,
                           shared_ptr<Caps>& msg) {
  if (strcmp(VOICE_COMING, name) == 0 || strcmp(PLAY, name) == 0) {
    playAwake();
  } else if (strcmp(WAKEUP_SOUND, name) == 0) {
    applyAwakeSound(msg);
  } else
    fprintf(stderr, "unexpected message from [%s]\n", name);
}

// cppcheck-suppress unusedFunction
void Activation::disconnected() {
  thread tmp([this]() { this->flora_disconnected(); });
  tmp.detach();
}

void Activation::flora_disconnected() {
  flora_cli.reset();
  reconn_mutex.lock();
  reconn_cond.notify_one();
  reconn_mutex.unlock();
}

void Activation::start() {
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
      cli->subscribe(PLAY);
      cli->subscribe(WAKEUP_SOUND);
      flora_cli = cli;
      reconn_cond.wait(locker);
    }
  }
}

void Activation::prepareForNextAwake() {
  if (is_open) {
    if (!volume_set) {
      char val[PROP_VALUE_MAX];
      property_get("persist.audio.volume.system", (char*)&val, "");
      int vol = atoi(val);
      fprintf(stdout, "init activation volume to %d\n", vol);
      rk_set_stream_volume(STREAM_SYSTEM, vol);
      volume_set = true;
    }
  }
}

void Activation::playAwake() {
  char propValue[PROP_VALUE_MAX];
  property_get("persist.dndmode.awakeswitch", (char*)propValue, "");
  if (strcmp(propValue, "close") == 0) {
    fprintf(stdout, "dnd mode, just skip\n");
    return;
  } else {
    property_get("state.network.connected", (char*)propValue, "");
    if (strcmp(propValue, "true") != 0) {
      fprintf(stdout, "current network is not available, just skip\n");
      return;
    }
  }
  if (is_open) {
    int id = rand() % files_from_flora.size();
    prepareWavPlayer(files_from_flora[id].c_str(), "system", keep_alive);
    startWavPlayer();
    prepareForNextAwake();
  }
}

void Activation::applyAwakeSound(shared_ptr<Caps>& msg) {
#define CAPS_READ(action)     \
  if (action != CAPS_SUCCESS) \
  goto ERROR
  if (!msg)
    goto ERROR;
  int32_t fCount;
  CAPS_READ(msg->read(fCount));
  files_from_flora.clear();
  if (fCount > MAX_PLAY_LIST)
    fCount = MAX_PLAY_LIST;
  const char* filename_list[MAX_PLAY_LIST];
  for (int i = 0; i < fCount; ++i) {
    files_from_flora.emplace_back();
    CAPS_READ(msg->read_string(files_from_flora.back()));
    filename_list[i] = files_from_flora[i].c_str();
  }
  is_open = fCount > 0;
  if (is_open) {
    prePrepareWavPlayer(filename_list, files_from_flora.size());
    fprintf(stdout, "wav player has been preloaded all activation files\n");
    prepareForNextAwake();
  }
  return;
ERROR:
  fprintf(stdout, "apply wakeup sound error\n");
}
