cmake_minimum_required(VERSION 2.8)

add_subdirectory(tools/rklogger)

file(GLOB YODA_CONFIG_FILES ./etc/yoda/*.json)
install(FILES ${YODA_CONFIG_FILES} DESTINATION /etc/yoda)
install(DIRECTORY ./etc/hotplug.d DESTINATION /etc)
install(FILES ./etc/manifest.json DESTINATION /etc)

install(DIRECTORY ./runtime/ DESTINATION /usr/yoda
        PATTERN "**/OWNERS" EXCLUDE
        PATTERN "**/.gitkeep" EXCLUDE
        PATTERN "**/*.md" EXCLUDE
        PATTERN "**/*.txt" EXCLUDE
        PATTERN "**/*.cc" EXCLUDE)
install(DIRECTORY ./apps DESTINATION /opt)
install(DIRECTORY ./res/media DESTINATION /opt)
install(DIRECTORY ./res/light DESTINATION /opt)
install(DIRECTORY ./include DESTINATION /usr)
