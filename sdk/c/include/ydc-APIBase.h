#ifndef YDC_APIBASE_H
#define YDC_APIBASE_H

#include<ydc-APIName.h>

#if __GNUC__ >=4 // it means the compiler is GCC version 4.0 or later
	#ifdef YDC_EXPORT
		//#warning "===== dynamic library ====="
		#define YDC_API_PUBLIC __attribute__((visibility ("default")))
		#define YDC_API_LOCAL __attribute__((visibility("hidden")))
	#else
		//#warning "===== static library ====="
		#define YDC_API_PUBLIC
		#define YDC_API_LOCAL
	#endif
#else
	#error "##### requires gcc version >= 4.0 #####"
#endif

struct ydc_api {
    APINAME name;
    char *nameSpace;
    char *methodName;
};

#endif