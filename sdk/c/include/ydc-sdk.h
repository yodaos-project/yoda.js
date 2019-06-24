/**************************************************************
 * Copyright (c) 2018-2020,Hangzhou Rokid Tech. Co., Ltd.
 * All rights reserved.
 *
 * FileName: ydc-sdk.h
 * Description: Dynamic library interface
 *
 * Date  :	2019.06.18
 * Author:  zijiao.wang@rokid.com
 * Modification: add file
 *
 **************************************************************/

#ifndef YDC_SDK_H
#define YDC_SDK_H

#include <stdint.h>
#include <flora-agent.h>
#include "ydc-APIName.h"
#include "ydc-APIBase.h"

#ifdef __cplusplus
extern "C" {
#endif

/*******************************************************
* Function name ：YdcInit
* Description: Inin yodaos c client sdk
* Parameter：
*   @lp	:uv loop, can null
*   @block: when lp != null && block > 0, will run the loop and block.
*           when lp != null && block == 0, will run the sdk loop.
* Return ：0 success, other fail
**********************************************************/
int YdcInit(void *lp, uint8_t block);

/*******************************************************
* Function name ：CallAPI
* Description: Call yodaos apis defined in ydc-APIName.h. 
* Parameter：
*   @api	: api name defined in ydc-APIName.h
*	@params : params. if null, type (void *)NULL
*   @timeout: timeout, unit:millisecond.
* Return ：the runtime return result and must call freeAPIResult to free the returned result.
**********************************************************/
flora_call_result *CallAPI(APINAME api, char *params, uint32_t timeout);

/*******************************************************
* Function name : CallAPIWithoutResult
* Description: Call yodaos apis defined in ydc-APIName.h, ignore ret result and use default timeout 5s
* Parameter：
*   @api	: api name defined in ydc-APIName.h
*	@params : params. if null, type (void *)NULL
* Return ：the flora ret code
**********************************************************/
int32_t CallAPIWithoutResult(APINAME api, char *params);

/*******************************************************
* Function name : getAPIResult
* Description: get the string result from apiresult
* Parameter：
*   @result	: flora_call_result, maybe from CallAPI
* Return ：the string buf
**********************************************************/
char *getAPIResult(flora_call_result *result);

/*******************************************************
* Function name : freeAPIResult
* Description: free the result
* Parameter：
*   @result	: flora_call_result, maybe from CallAPI returned
* Return ：NULL
**********************************************************/
void freeAPIResult(flora_call_result *result);

#ifdef __cplusplus
}
#endif

#endif /* YDC_SDK_H */
