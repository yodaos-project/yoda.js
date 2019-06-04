#include <stdio.h>
#include <unistd.h>
#include <fstream>
#include <iterator>
#include "flora-agent.h"

using namespace std;
using namespace flora;

bool startsWith(const char *str, const char *pre)
{
    size_t lenpre = strlen(pre),
           lenstr = strlen(str);
    return lenstr < lenpre ? false : strncmp(pre, str, lenpre) == 0;
}

int main(int argc, const char* argv[])
{
  auto floraAgent = new Agent();
  floraAgent->config(FLORA_AGENT_CONFIG_URI, "unix:/var/run/flora.sock#voice-interface");
  floraAgent->declare_method("yodaos.voice-interface.tts.speak", [=](const char * name, shared_ptr<Caps> msg, shared_ptr<Reply> reply) {
    string channel;
    msg->read(channel);
    printf("incoming speak request: %s, opening %s\n", channel.c_str(), argv[1]);

    if (startsWith(channel.c_str(), "yodaos.speech-synthesis.do-not-send-data")) {
      reply->end(0);
      return;
    }

    FILE* fp = fopen(argv[1], "r");
    if (!fp) {
      printf("failed to open file");
      reply->end(1);
      return;
    }
    reply->end(0);

    #define buffer_size 8192
    int c;
    size_t idx = 0;
    int buf[buffer_size];
    while (true)
    {
      if ((c = fgetc(fp)) != EOF) {
        buf[idx] = c;
        idx++;
        if (idx < buffer_size) {
          continue;
        }
      }

      shared_ptr<Caps> fmsg = Caps::new_instance();
      fmsg->write(0);
      fmsg->write(buf, idx);
      floraAgent->post(channel.c_str(), fmsg, FLORA_MSGTYPE_INSTANT);
      idx = 0;

      if (c == EOF) {
        fclose(fp);
        break;
      }
    }


    shared_ptr<Caps> emsg = Caps::new_instance();
    emsg->write(1);
    floraAgent->post(channel.c_str(), emsg, FLORA_MSGTYPE_INSTANT);
    printf("data written end\n");
  });

  floraAgent->start();
  while (true) {};
  return 0;
}
