{
  "targets": [{
    "target_name": "lumen",
    "include_dirs": [
      "<!(node -e \"require('nan')\")",
      "./src",
    ],
    "sources": [
      "src/LumenWrap.cc",
    ],
    "cflags": [
      "-include rokid/rokid_types.h",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lrklumen_light",
    ],
  }]
}