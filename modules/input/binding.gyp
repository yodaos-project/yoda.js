{
  "targets": [{
    "target_name": "input_down",
    "include_dirs": [
      "<!(node -e \"require('nan')\")",
      "./src",
      "./src/deps",
    ],
    "sources": [
      "src/InputDispatcher.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-linputflinger",
    ],
  }]
}