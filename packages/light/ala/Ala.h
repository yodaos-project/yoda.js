/*--------------------------------------------------------------------
This file is part of the Arduino ALA library.

The Arduino ALA library is free software: you can redistribute it
and/or modify it under the terms of the GNU General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

The Arduino ALA library is distributed in the hope that it will be
useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with The Arduino ALA library.  If not, see
<http://www.gnu.org/licenses/>.
--------------------------------------------------------------------*/

#ifndef ALA_h
#define ALA_h

#include <stdint.h>

////////////////////////////////////////////////////////////////////////////////
// Drivers

#define ALA_RAW 0
#define ALA_PWM 1
#define ALA_WS2812 2
#define ALA_KAMINO 3

////////////////////////////////////////////////////////////////////////////////
// Animations

#define ALA_ON 101
#define ALA_OFF 102
#define ALA_BLINK 103
#define ALA_BLINKALT 104
#define ALA_SPARKLE 105
#define ALA_SPARKLE2 106
#define ALA_STROBO 107
#define ALA_CYCLECOLORS 151
#define ALA_PIXELSHIFTRIGHT 201
#define ALA_PIXELSHIFTLEFT 202
#define ALA_PIXELBOUNCE 203
#define ALA_PIXELSMOOTHSHIFTRIGHT 211
#define ALA_PIXELSMOOTHSHIFTLEFT 212
#define ALA_PIXELSMOOTHBOUNCE 213
#define ALA_COMET 221
#define ALA_COMETCOL 222
#define ALA_BARSHIFTRIGHT 231
#define ALA_BARSHIFTLEFT 232
#define ALA_MOVINGBARS 241
#define ALA_MOVINGGRADIENT 242
#define ALA_LARSONSCANNER 251
#define ALA_LARSONSCANNER2 252
#define ALA_FADEIN 301
#define ALA_FADEOUT 302
#define ALA_FADEINOUT 303
#define ALA_GLOW 304
#define ALA_PLASMA 305
#define ALA_FADECOLORS 351
#define ALA_FADECOLORSLOOP 352
#define ALA_PIXELSFADECOLORS 353
#define ALA_FLAME 354
#define ALA_FIRE 501
#define ALA_BOUNCINGBALLS 502
#define ALA_BUBBLES 503
#define ALA_ENDSEQ 0

////////////////////////////////////////////////////////////////////////////////

// Strobo effect duty cycle (10=1/10)
#define ALA_STROBODC 10

////////////////////////////////////////////////////////////////////////////////

struct AlaColor
{
    union
    {
        struct
        {
            uint8_t r;
            uint8_t g;
            uint8_t b;
        };
        uint8_t raw[3];
    };

    inline AlaColor() __attribute__((always_inline))
    {
    }

    // allow construction from R, G, B
    inline AlaColor( uint8_t ir, uint8_t ig, uint8_t ib)  __attribute__((always_inline))
    : r(ir), g(ig), b(ib)
    {
    }

    // allow construction from 32-bit (really 24-bit) bit 0xRRGGBB color code
    inline AlaColor( uint32_t colorcode)  __attribute__((always_inline))
    : r((colorcode >> 16) & 0xFF), g((colorcode >> 8) & 0xFF), b((colorcode >> 0) & 0xFF)
    {
    }

    bool operator == (const AlaColor &c) const
    {
        return(this->r == c.r and this->g == c.g and this->b == c.b);
    }
/*
    AlaColor getPixel(AlaColor maxOut)
    {
        return AlaColor(r*maxOut.r/255, g*maxOut.g/255, b*maxOut.b/255);
    }
*/
    AlaColor sum(AlaColor color)
    {
        int r0 = min(color.r + r, 255);
        int g0 = min(color.g + g, 255);
        int b0 = min(color.b + b, 255);
        return AlaColor(r0, g0, b0);
    }

    AlaColor interpolate(AlaColor color, float x)
    {
        int r0 = x*(color.r - r) + r;
        int g0 = x*(color.g - g) + g;
        int b0 = x*(color.b - b) + b;
        return AlaColor(r0, g0, b0);
    }

    AlaColor scale(float k)
    {
        int r0 = min(r*k, 255);
        int g0 = min(g*k, 255);
        int b0 = min(b*k, 255);
        return AlaColor(r0, g0, b0);
    }

    typedef enum {
        Aqua    = 0x00FFFF,
        Black   = 0x000000,
        Blue    = 0x0000FF,
        Cyan    = 0x00FFFF,
        Gold    = 0xFFD700,
        Gray    = 0x808080,
        Green   = 0x008000,
        Lime    = 0x00FF00,
        Magenta = 0xFF00FF,
        Navy    = 0x000080,
        Olive   = 0x808000,
        Purple  = 0x800080,
        Red     = 0xFF0000,
        Teal    = 0x008080,
        White   = 0xFFFFFF,
        Yellow  = 0xFFFF00
    } ColorCodes;
} ;

////////////////////////////////////////////////////////////////////////////////
// Struct definitions
////////////////////////////////////////////////////////////////////////////////

struct AlaPalette
{
    int numColors;
    AlaColor *colors;

    /**
    * Get the interpolated color from the palette.
    * The argument is a floating number between 0 and numColors.
    */
    AlaColor getPalColor(float i)
    {
        int i0 = (int)i%(numColors);
        int i1 = (int)(i+1)%(numColors);

        // decimal part is used to interpolate between the two colors
        float t0 = i - trunc(i);
        //float t0 = i - (int)i;

        return colors[i0].interpolate(colors[i1], t0);
    }

    bool operator == (const AlaPalette &c) const
    {
        if (!(this->numColors == c.numColors))
            return false;

        for(int i=0; i<numColors; i++)
        {
            if (!(this->colors[i] == c.colors[i]))
                return false;
        }
        return true;
    }

};


struct AlaSeq
{
    int animation;
    long speed;
    long duration;
    AlaPalette palette;
};


////////////////////////////////////////////////////////////////////////////////
// Palette definitions
////////////////////////////////////////////////////////////////////////////////

// Empty palette
extern AlaPalette alaPalNull;
// Red,Green,Blue sequence
extern AlaPalette alaPalRgb;
// Rainbow colors
extern AlaPalette alaPalRainbow;
// Rainbow colors with alternating stripes of black
extern AlaPalette alaPalRainbowStripe;
extern AlaPalette alaPalParty;
extern AlaPalette alaPalHeat;
// Fire palette to be used with ALA_FIRE effect
extern AlaPalette alaPalFire;
extern AlaPalette alaPalCool;

////////////////////////////////////////////////////////////////////////////////
// Utility functions
////////////////////////////////////////////////////////////////////////////////

int getStep(long t0, long t, int v);
float getStepFloat(long t0, long t, float v);
float mapfloat(float x, float in_min, float in_max, float out_min, float out_max);

#endif