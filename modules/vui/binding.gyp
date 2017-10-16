{
  "targets": [{
    "target_name": "ams_down",
    "include_dirs": [
      "<!(node -e \"require('nan')\")",
      "./src",
      "./src/deps",
    ],
    "sources": [
      "src/AppDispatcher.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lrkams",
    ],
  }, {
    "target_name": "inputdown",
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