{
  "targets": [{
    "target_name": "volume",
    "include_dirs": [
      "<!(node -e \"require('nan')\")",
      "./",
    ],
    "sources": [
      "src/VolumeWrap.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lrkvolumecontrol",
    ],
  }]
}