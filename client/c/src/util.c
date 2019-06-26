/**
* @file  util.c  
* @brief Utils are used in client sdk.
*/
#include <stdio.h>
#include <stdlib.h>
#include <yodaos_inner.h>

char *yodaos_ReadJsonFile(char *filepath) {
    char *data = NULL;
    long int len = 0;
    FILE *f = fopen(filepath, "rb");
    if(!f) {
        perror("Open file error!");
        return NULL;
    }

    fseek(f, 0, SEEK_END);
    len = ftell(f);
    fseek(f, 0, SEEK_SET);

    data = (char *) malloc(len+1);

    fread(data, 1, len, f);

    data[len] = '\0';
    fclose(f);

    return data;
}