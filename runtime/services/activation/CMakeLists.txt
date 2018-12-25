project(activation CXX)
set(CMAKE_CXX_STANDARD 11)

add_executable(activation activation.cc main.cc)
target_include_directories(activation PRIVATE
  ${CMAKE_INCLUDE_DIR}/include
  ${CMAKE_INCLUDE_DIR}/usr/include
  ${CMAKE_INCLUDE_DIR}/usr/include/caps
)
target_link_libraries(activation flora-cli caps cjson
  property android_cutils
  wavplayer pthread dl pulse rt rkvolumecontrol)

install(TARGETS activation
	RUNTIME DESTINATION bin
	LIBRARY DESTINATION lib
	PUBLIC_HEADER DESTINATION include)
