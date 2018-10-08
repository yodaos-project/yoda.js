project(activation CXX)
set(CMAKE_CXX_STANDARD 11)

add_executable(activation activation.cc)
target_include_directories(activation PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/caps
  ${CMAKE_INCLUDE_DIR}/usr/include/librplayer
)
target_link_libraries(activation flora-cli caps
  property android_cutils
  rplayer avformat avutil
  pthread dl pulse rt)

install(TARGETS activation
	RUNTIME DESTINATION bin
	LIBRARY DESTINATION lib
	PUBLIC_HEADER DESTINATION include)
