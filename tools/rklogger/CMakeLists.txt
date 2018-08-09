add_executable(rklogger rklogger.c)
install(TARGETS rklogger
	RUNTIME DESTINATION bin
	LIBRARY DESTINATION lib
	PUBLIC_HEADER DESTINATION include)
