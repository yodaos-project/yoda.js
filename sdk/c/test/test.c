/**************************************************************
 * Copyright (c) 2018-2020,Hangzhou Rokid Tech. Co., Ltd.
 * All rights reserved.
 *
 * FileName: test.c
 * Description: Just test yoda c app.
 *
 * Date  :	2019.06.18
 * Author:  
 * Modification: add file
 *
 **************************************************************/

#include <stdio.h>
#include <unistd.h>
#include <ydc-sdk.h>
#include <stdbool.h>

int main() {
    YdcInit((void *)NULL, 0);
    
    pause();
    printf("Exit!!!\n");

    return 0;
}
