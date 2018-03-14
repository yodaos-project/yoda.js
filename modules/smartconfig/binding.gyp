{
  "targets": [{
    "target_name": "smartconfig",
    "include_dirs": [
      "./",
      "<!(node -e \"require('nan')\")",
    ],
    "sources": [
      "src/SmartConfig.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lsmartconfig",
    ],
  }]
}