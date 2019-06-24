#include <ydc-inner.h>
#include <cjson/cJSON.h>
#include <stdio.h>
#include <stdlib.h>

char *ReadJsonFile(char *filepath) {
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