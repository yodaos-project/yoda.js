{
  "targets": [{
    "target_name": "ams",
    "include_dirs": [
      "dbus-c++-1",
      "<!(node -e \"require('nan')\")",
      "./src",
    ],
    "sources": [
      "src/AmClientWrap.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-ldbus-c++-1",
      "-ldbus-1",
      "-lrknative",
    ],
  }]
}