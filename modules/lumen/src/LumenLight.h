/* please see client/demo/demo.cpp
*/
#ifndef LUMEN_LIGHT_H
#define LUMEN_LIGHT_H

#include "LumenClient.h"

using namespace android;

class LumenLight : public virtual RefBase {
public:
    LumenLight ();
    virtual ~LumenLight ();

    /* get all led data from server */
   unsigned char*  lumen_get_data(unsigned char* buf, int len);

    /* set (true) : run ->the lumenflinger service thread will running and ready to draw
     * set (false) : pause ->the service thread in sleep */
    void lumen_set_enable(bool cmd);

    /* draw all led to show the color buff you set
     * buf[m_ledCount * m_pixelFormat]; len = sizeof(buf);
     * if m_pixelFormat == 3, means RGB
     * you can set buf[ledNum] = 0xff;  for the red component
     * you can set buf[ledNum + 1] = 0xff  for the green component
     * you can set buf[ledNum + 2] = 0xff  for the blue component
     * ledNum: from 0 to  (m_ledCount - 1)*/
    int lumen_draw(unsigned char* buf, int len);

    int lumen_set_color(unsigned char* color, int pixelFormat);
    /* draw only one led num to show the RGB_color[PXL_FMT_RGB]*/
    int lumen_set_led(int led_num);
    /* draw  led show the RGB_color[PXL_FMT_RGB] according to the angle*/
    int lumen_flinger(double angle);

    /*after you call lumen_init() the below parameters  will be get*/
    int m_platform;// platform id, you can customized your light apps depend on it
    int m_frameSize; //framesize = m_ledCount *  m_pixelFormat
    int m_ledCount; // depend your led driver
    int m_pixelFormat;// 3  :RGB,  depend the led driver
    int m_fps; //the max fps for lumenflinger service draw

private:
    void initialize ();
    int lumen_get_flinger_led(double angle);
    sp<LumenClient> LightClient;
    unsigned char RGB_color[PXL_FMT_RGB]; // initialize color RGB: 0X0, 0X0, 0X1F
};

#endif
