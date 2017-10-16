
#ifndef LUMEN_CLIENT_H
#define LUMEN_CLIENT_H

#include <binder/IServiceManager.h>
#include <binder/IPCThreadState.h>
#include <binder/IInterface.h>
#include <binder/MemoryBase.h>
#include <binder/Parcel.h>

#include <pthread.h>
#include <cutils/log.h>
#include <utils/Singleton.h>
#include <hardware/easyr2_atomic.h>
#include <stdint.h>

using namespace android;

typedef enum {
    PLATFORM_ALIEN = 0,
    PLATFORM_PEBBLE = 1,
    PLATFORM_MINI = 2,
    PLATFORM_NANA = 3
} lumen_platform_t;

typedef enum {
    PXL_FMT_RGB = 3,
} lumen_pxl_fmt_t;

enum {
    LUMEN_SUCCESS = 0,
    LUMEN_SERVER_FAIL = 1,
    LUMEN_DATA_FAIL = 2,
};

typedef struct lumen_buffer_cblk {
    easyr2_atomic_t spin_lock;
    lumen_platform_t platform;
    int frame_size;
    int led_count;
    int pixel_format;
    int fps;
    int last_drawing_ret;
    int is_dirty;
} lumen_buffer_cblk_t; // original def in IRKLumen.h

class LumenClient;
class LumenClientDeathNotification : public IBinder::DeathRecipient {
public:
    LumenClientDeathNotification(LumenClient *client) : m_client(client) {
//        ALOGV ("LumenClientDeathNotification created");
    }

    virtual ~LumenClientDeathNotification () {
//        ALOGV ("LumenClientDeathNotification destroy");
    }

private:
    virtual void binderDied (const wp<IBinder>& who);
    LumenClient *m_client;
};

class LumenClient : public virtual RefBase {
public:
    LumenClient ();
    virtual ~LumenClient ();

    bool bindToService ();
    int requestBuffer ();
    bool lock ();
    void unlockAndPost ();
    void lunch ();
    void pause ();

    lumen_buffer_cblk_t *getCblk () {
        return m_cblk;
    }

    unsigned char *getRaw () {
        return m_data;
    }

private:
    friend class LumenClientDeathNotification;
    void notifyDeath();
    bool isServiceAlive();
    void setStat (int cmd);

    sp<IBinder> m_lumenProxy;
    sp<IMemory> m_sharedBuffer;
    sp<IBinder::DeathRecipient> m_deathRecipient;

    lumen_buffer_cblk_t *m_cblk;
    unsigned char *m_data;
    unsigned int m_ClientNum;
    bool is_start;

    int m_frameSize;
    int m_bufferSize;
    int m_platform;
    int m_pixelFormat;
    int m_fps;
};

#endif
