#include "activation.h"
#include <cjson/cJSON.h>
#include <sys/types.h>
#include <dirent.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fstream>
#include <sstream>

using namespace std;
using namespace flora;

const char* VOICE_COMING = "rokid.turen.voice_coming";
const char* AWAKE_EFFECT = "rokid.custom_config.awake_effect";
const int32_t FILE_MAX_SIZE = 20 * 1024;
Activation::Activation() {
  srand(time(NULL));
  initPath();
  refreshFileList();
  prePrepareWavPlayer(filename_list, filename_list_size);
  fprintf(stdout, "wav player has been preloaded all activation files\n");
}

// cppcheck-suppress unusedFunction
void Activation::recv_post(const char *name, uint32_t msgtype, shared_ptr <Caps> &msg) {
  if (strcmp(VOICE_COMING, name) == 0) {
    playAwake();
  } else {
    applyAwakeEffect(msg);
  }
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
  shared_ptr <Client> cli;
  unique_lock <mutex> locker(reconn_mutex);
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

void Activation::prepareForNextAwake() {
  int id = rand() % filename_list_size;
  prepareWavPlayer(filename_list[id], "system", true);
  if (!volume_set) {
    char val[PROP_VALUE_MAX];
    property_get("persist.audio.volume.system", (char *) &val, "");
    int vol = atoi(val);
    fprintf(stdout, "init activation volume to %d\n", vol);
    rk_set_stream_volume(STREAM_SYSTEM, vol);
    volume_set = true;
  }
}

void Activation::playAwake() {
  char network_is_available[PROP_VALUE_MAX];
  property_get("state.network.connected", (char *) network_is_available, "");
  if (strcmp(network_is_available, "true") != 0) {
    fprintf(stdout, "current network is not available, just skip\n");
    return;
  }
  startWavPlayer();
  prepareForNextAwake();
}

void Activation::applyAwakeEffect(shared_ptr <Caps> &msg) {
  refreshFileList();
  prePrepareWavPlayer(filename_list, filename_list_size);
  fprintf(stdout, "wav player has been preloaded all activation files\n");
}

void Activation::initPath() {
  std::ifstream ifile("/etc/yoda/env.json");
  char buf[FILE_MAX_SIZE];
  char ch;
  int32_t size = 0;
  while(size < FILE_MAX_SIZE && ifile.get(ch))
    buf[size++] = ch;
  cJSON *root = cJSON_Parse(buf);
  if (!root) {
    fprintf(stdout, "read env.json error: %s\n", cJSON_GetErrorPtr());
    return;
  }
  if (root->type == cJSON_Object) {
    cJSON *activation = cJSON_GetObjectItem(root, "activation");
    if (activation && activation->type == cJSON_Object) {
      cJSON *defaultPath = cJSON_GetObjectItem(activation, "defaultPath");
      if (defaultPath && defaultPath->type == cJSON_String) {
        fprintf(stdout, "read defaultPath success: %s\n", defaultPath->valuestring);
        default_path = defaultPath->valuestring;
        if (default_path.length() > 1 && default_path[default_path.length() - 1] != '/')
          default_path += "/";
      } else {
        fprintf(stdout, "read defaultPath error\n");
      }
      cJSON *customPath = cJSON_GetObjectItem(activation, "customPath");
      if (customPath && customPath->type == cJSON_String) {
        fprintf(stdout, "read customPath success: %s\n", customPath->valuestring);
        custom_path = customPath->valuestring;
        if (custom_path.length() > 1 && custom_path[custom_path.length() - 1] != '/')
          custom_path += "/";
      } else {
        fprintf(stdout, "read customPath error\n");
      }
    }
  }
  cJSON_Delete(root);
  return;
}

vector<string> Activation::getFiles(const string &path) {
  vector<string> rst;
  // check the parameter !
  if (nullptr == path.c_str()) {
    fprintf(stdout, "dir path is null\n");
    return rst;
  }
  struct stat s;
  lstat(path.c_str(), &s);
  if (!S_ISDIR(s.st_mode)) {
    fprintf(stdout, "dir_name is not a valid directory\n");
    return rst;
  }
  struct dirent *filename;
  DIR *dir;
  dir = opendir(path.c_str());
  if (nullptr == dir) {
    fprintf(stdout, "Can not open dir: %s\n", path.c_str());
    return rst;
  }

  /* read all the files in the dir */
  while ((filename = readdir(dir)) != nullptr) {
    // get rid of "." and ".."
    if (strcmp(filename->d_name, ".") == 0 ||
        strcmp(filename->d_name, "..") == 0)
      continue;
    string tmp = path + filename->d_name;
    fprintf(stdout, "activation file: %s\n", tmp.c_str());
    rst.push_back(tmp);
  }
  return rst;
}

void Activation::refreshFileList() {
  char is_awakeswitch_open[PROP_VALUE_MAX];
  property_get("persist.sys.awakeswitch", (char *) is_awakeswitch_open, "");
  bool defaultSwitch = strcmp(is_awakeswitch_open, "open") == 0;
  property_get("persist.sys.customawakeswitch", (char *) is_awakeswitch_open, "");
  bool customSwitch = strcmp(is_awakeswitch_open, "open") == 0;
  if (customSwitch) {
    files = getFiles(custom_path);
  }
  if (files.size() == 0 && defaultSwitch) {
    files = getFiles(default_path);
  }
  filename_list_size = files.size() > 10 ? 10 : files.size();
  for(size_t i = 0; i < filename_list_size; ++i) {
    filename_list[i] = files[i].data();
  }
}



