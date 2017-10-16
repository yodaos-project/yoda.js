{
  "targets": [{
    "target_name": "rplay",
    "include_dirs": [
      "./",
      "<!(node -e \"require('nan')\")",
      "$(STAGING_DIR)/usr/include/librplayer",
      "$(STAGING_DIR)/usr/include/SDL2",
    ],
    "sources": [
      "src/PlayWrap.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lrplayer",
      "-lavformat",
    ],
  }]
}