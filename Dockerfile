FROM ubuntu:bionic

RUN apt-get update && \
  apt-get install -y \
    cmake curl git \
    pulseaudio libpulse-dev \
    libdbus-1-dev \
    libz-dev \
    libffi-dev \
  && \
  curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
  apt-get install -y \
    nodejs

RUN mkdir /vendor && \
  cd /vendor && \
  git clone https://github.com/yodaos-project/node-flora.git && \
  git clone https://github.com/yodaos-project/ShadowNode.git && \
  cd /vendor/node-flora && \
  npm install && \
  script/install && script/build && \
  cp -r out/usr/* /usr && \
  cd /vendor/ShadowNode && \
  tools/build.py --buildtype release --clean --napi  --install --install-prefix /usr

ADD . /workspace

RUN cd /workspace && \
  cmake `pwd` -B`pwd`/build -DCMAKE_BUILD_HOST=ON -DCMAKE_EXTERNAL_SYSROOT=/ -DCMAKE_PREFIX_PATH=/ -DCMAKE_INCLUDE_DIR=/ && \
  cd build; make install; cd - && \
  mkdir /data
