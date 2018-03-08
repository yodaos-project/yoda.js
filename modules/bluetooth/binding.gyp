{
  "targets": [{
    "target_name": "bluetooth",
    "include_dirs": [
      "<!(node -e \"require('nan')\")",
      "./src",
    ],
    "sources": [
      "src/BluetoothWrap.cc",
    ],
    "cflags!": [ "-fno-exceptions", "-include rokid/rokid_types.h" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lrokid-bt",
      "-landroid_utils",
      "-landroid_cutils",
      "-landroid_hardware",
      "-lpthread",
    ],
  }]
}