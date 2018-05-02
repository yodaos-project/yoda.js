{
  "targets": [{
    "target_name": "property",
    "include_dirs": [
      "./",
      "<!(node -e \"require('nan')\")",
    ],
    "sources": [
      "src/PropertyWrap.cc",
    ],
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions", "-std=c++11" ],
    "libraries": [
      "-lproperty",
      "-landroid_cutils",
    ],
  }]
}