{
  "targets": [{
    "target_name": "wifi",
    "include_dirs": [
      "<!(node -e \"require('nan')\")",
      "./",
    ],
    "sources": [
      "src/WifiWrap.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lwpa_ctrl",
    ],
  }]
}