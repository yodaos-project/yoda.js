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
    "cflags!": [ "-fno-exceptions", "-include rokid/rokid_types.h" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lrklumen_light",
    ],
  }]
}