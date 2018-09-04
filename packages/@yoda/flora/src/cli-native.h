#pragma once

#ifdef __cplusplus
extern "C" {
#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>
}
#include <list>
#include <mutex>
#include <memory>
#include <string>
#endif // __cplusplus
#include "flora-cli.h"

class NativeCallback;

typedef struct {
	// 0: recv_post
	// 1: disconnected
	int32_t cb_type;
	std::string name;
	uint32_t msgtype;
	std::shared_ptr<Caps> msg;
} AsyncCallbackInfo;

typedef struct {
	std::shared_ptr<flora::Client> cli;
	std::list<AsyncCallbackInfo> pending_callbacks;
	std::mutex cb_mutex;
} flora_cli_stl;

typedef struct {
	iotjs_jobjectwrap_t jobjectwrap;
	NativeCallback* callback;
	uv_async_t async;
	// IOTJS_ALLOC分配的内存全部清零，不可直接定义stl结构体
	flora_cli_stl* stl_st;
} IOTJS_VALIDATED_STRUCT(iotjs_flora_cli_t);
