{
  "targets": [{
    "target_name": "tts",
    "include_dirs": [
      "<!(node -e \"require('nan')\")",
      "./",
    ],
    "sources": [
      "src/TtsWrap.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lrktts",
    ],
  }]
}