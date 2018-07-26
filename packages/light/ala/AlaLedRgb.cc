#include "Ala.h"
#include "AlaLedRgb.h"

#include "ExtNeoPixel.h"
#include "ExtTlc5940.h"

AlaLedRgb::AlaLedRgb()
{
    // set default values
    maxOut = 0xFFFFFF;
    speed = 1000;
    animSeqLen = 0;
    lastRefreshTime = 0;
    refreshMillis = 1000/50;
    pxPos = NULL;
    pxSpeed = NULL;
}

void AlaLedRgb::initRaw(int numLeds, byte *pins)
{
    this->driver = ALA_RAW;
    this->numLeds = numLeds;
    this->pins = pins;

    // allocate and clear leds array
    leds = (AlaColor *)malloc(3*numLeds);
    memset(leds, 0, 3*numLeds);
}

void AlaLedRgb::setBrightness(AlaColor maxOut)
{
    this->maxOut = maxOut;
}

void AlaLedRgb::setRefreshRate(int refreshRate)
{
    this->refreshMillis = 1000/refreshRate;
}

int AlaLedRgb::getCurrentRefreshRate()
{
    return refreshRate;
}

void AlaLedRgb::setAnimation(int animation, long speed, AlaColor color)
{
    // is there any change?
    if (this->animation == animation &&
        this->speed == speed &&
        this->palette.numColors == 1 &&
        this->palette.colors[0] == color)
        return;

    // delete any previously allocated array
    if (pxPos!=NULL)
    { delete[] pxPos; pxPos=NULL; }
    if (pxSpeed!=NULL)
    { delete[] pxSpeed; pxSpeed=NULL; }

    this->animation = animation;
    this->speed = speed;

    this->palette.numColors = 1;
    this->palette.colors = (AlaColor*)malloc(3);
    this->palette.colors[0] = color;

    setAnimationFunc(animation);
    animStartTime = millis();
}

void AlaLedRgb::setAnimation(int animation, long speed, AlaPalette palette)
{
    // is there any change?
    if (this->animation == animation && this->speed == speed && this->palette == palette)
        return;

    // delete any previously allocated array
    if (pxPos!=NULL)
    { delete[] pxPos; pxPos=NULL; }
    if (pxSpeed!=NULL)
    { delete[] pxSpeed; pxSpeed=NULL; }

    this->animation = animation;
    this->speed = speed;
    this->palette = palette;

    setAnimationFunc(animation);
    animStartTime = millis();
}


void AlaLedRgb::setAnimation(AlaSeq animSeq[])
{
    this->animSeq = animSeq;

    // initialize animSeqDuration and animSeqLen variables
    animSeqDuration = 0;
    for(animSeqLen=0; animSeq[animSeqLen].animation!=ALA_ENDSEQ; animSeqLen++)
    {
        animSeqDuration = animSeqDuration + animSeq[animSeqLen].duration;
    }
    animSeqStartTime = millis();
}

void AlaLedRgb::nextAnimation()
{
    currAnim = (currAnim+1)%animSeqLen;
}

bool AlaLedRgb::runAnimation()
{
    // skip the refresh if not enough time has passed since last update
    unsigned long cTime = millis();
    if (cTime < lastRefreshTime + refreshMillis)
        return false;

    // calculate real refresh rate
    refreshRate = 1000/(cTime - lastRefreshTime);

    lastRefreshTime = cTime;


    if (animSeqLen != 0)
    {
        if(animSeq[currAnim].duration == 0)
        {
            setAnimation(animSeq[currAnim].animation, animSeq[currAnim].speed, animSeq[currAnim].palette);
        }
        else
        {
            long c = 0;
            long t = (cTime-animSeqStartTime) % animSeqDuration;
            for(int i=0; i<animSeqLen; i++)
            {
                if (t>=c && t<(c+animSeq[i].duration))
                {
                    setAnimation(animSeq[i].animation, animSeq[i].speed, animSeq[i].palette);
                    break;
                }
                c = c + animSeq[i].duration;
            }
        }
    }

    if (animFunc != NULL)
    {
        (this->*animFunc)();

        // use an 8 bit shift to divide by 256
        if (driver == ALA_RAW)
        {
            for (int i=0; i<numLeds; i++)
            {
                int j = 3*i;
                (this->*renderFunc)(pins[j],   (leds[i].r*maxOut.r)>>8);
                (this->*renderFunc)(pins[j+1], (leds[i].g*maxOut.g)>>8);
                (this->*renderFunc)(pins[j+2], (leds[i].b*maxOut.b)>>8);
            }
        }
    }
    return true;
}


///////////////////////////////////////////////////////////////////////////////

void AlaLedRgb::setAnimationFunc(int animation)
{

    switch(animation)
    {
        case ALA_ON:                    animFunc = &AlaLedRgb::on;                    break;
        case ALA_OFF:                   animFunc = &AlaLedRgb::off;                   break;
        case ALA_BLINK:                 animFunc = &AlaLedRgb::blink;                 break;
        case ALA_BLINKALT:              animFunc = &AlaLedRgb::blinkAlt;              break;
        case ALA_SPARKLE:               animFunc = &AlaLedRgb::sparkle;               break;
        case ALA_SPARKLE2:              animFunc = &AlaLedRgb::sparkle2;              break;
        case ALA_STROBO:                animFunc = &AlaLedRgb::strobo;                break;
        case ALA_CYCLECOLORS:           animFunc = &AlaLedRgb::cycleColors;           break;

        case ALA_PIXELSHIFTRIGHT:       animFunc = &AlaLedRgb::pixelShiftRight;       break;
        case ALA_PIXELSHIFTLEFT:        animFunc = &AlaLedRgb::pixelShiftLeft;        break;
        case ALA_PIXELBOUNCE:           animFunc = &AlaLedRgb::pixelBounce;           break;
        case ALA_PIXELSMOOTHSHIFTRIGHT: animFunc = &AlaLedRgb::pixelSmoothShiftRight; break;
        case ALA_PIXELSMOOTHSHIFTLEFT:  animFunc = &AlaLedRgb::pixelSmoothShiftLeft;  break;
        case ALA_PIXELSMOOTHBOUNCE:     animFunc = &AlaLedRgb::pixelSmoothBounce;     break;
        case ALA_COMET:                 animFunc = &AlaLedRgb::comet;                 break;
        case ALA_COMETCOL:              animFunc = &AlaLedRgb::cometCol;              break;
        case ALA_MOVINGBARS:            animFunc = &AlaLedRgb::movingBars;            break;
        case ALA_MOVINGGRADIENT:        animFunc = &AlaLedRgb::movingGradient;        break;
        case ALA_LARSONSCANNER:         animFunc = &AlaLedRgb::larsonScanner;         break;
        case ALA_LARSONSCANNER2:        animFunc = &AlaLedRgb::larsonScanner2;        break;

        case ALA_FADEIN:                animFunc = &AlaLedRgb::fadeIn;                break;
        case ALA_FADEOUT:               animFunc = &AlaLedRgb::fadeOut;               break;
        case ALA_FADEINOUT:             animFunc = &AlaLedRgb::fadeInOut;             break;
        case ALA_GLOW:                  animFunc = &AlaLedRgb::glow;                  break;
        case ALA_PLASMA:                animFunc = &AlaLedRgb::plasma;                break;
        case ALA_PIXELSFADECOLORS:      animFunc = &AlaLedRgb::pixelsFadeColors;      break;
        case ALA_FADECOLORS:            animFunc = &AlaLedRgb::fadeColors;            break;
        case ALA_FADECOLORSLOOP:        animFunc = &AlaLedRgb::fadeColorsLoop;        break;

        case ALA_FIRE:                  animFunc = &AlaLedRgb::fire;                  break;
        case ALA_BOUNCINGBALLS:         animFunc = &AlaLedRgb::bouncingBalls;         break;
        case ALA_BUBBLES:               animFunc = &AlaLedRgb::bubbles;               break;

        default:                        animFunc = &AlaLedRgb::off;
    }

}


void AlaLedRgb::on()
{
    for(int i=0; i<numLeds; i++)
    {
        leds[i] = palette.colors[0];
    }
}

void AlaLedRgb::off()
{
    for(int i=0; i<numLeds; i++)
    {
        leds[i] = 0x000000;
    }
}


void AlaLedRgb::blink()
{
    int t = getStep(animStartTime, speed, 2);
    int k = (t+1)%2;
    for(int x=0; x<numLeds; x++)
    {
        leds[x] = palette.colors[0].scale(k);
    }
}

void AlaLedRgb::blinkAlt()
{
    int t = getStep(animStartTime, speed, 2);

    for(int x=0; x<numLeds; x++)
    {
        int k = (t+x)%2;
        leds[x] = palette.colors[0].scale(k);
    }
}

void AlaLedRgb::sparkle()
{
    int p = speed/100;
    for(int x=0; x<numLeds; x++)
    {
        leds[x] = palette.colors[random(palette.numColors)].scale(random(p)==0);
    }
}

void AlaLedRgb::sparkle2()
{
    int p = speed/10;
    for(int x=0; x<numLeds; x++)
    {
        if(random(p)==0)
            leds[x] = palette.colors[random(palette.numColors)];
        else
            leds[x] = leds[x].scale(0.88);
    }
}


void AlaLedRgb::strobo()
{
    int t = getStep(animStartTime, speed, ALA_STROBODC);

    AlaColor c = palette.colors[0].scale(t==0);
    for(int x=0; x<numLeds; x++)
    {
        leds[x] = c;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////
// Shifting effects
////////////////////////////////////////////////////////////////////////////////////////////

void AlaLedRgb::pixelShiftRight()
{
    int t = getStep(animStartTime, speed, numLeds);
    float tx = getStepFloat(animStartTime, speed, palette.numColors);
    AlaColor c = palette.getPalColor(tx);

    for(int x=0; x<numLeds; x++)
    {
        int k = (x==t ? 1:0);
        leds[x] = c.scale(k);
    }
}

void AlaLedRgb::pixelShiftLeft()
{
    int t = getStep(animStartTime, speed, numLeds);
    float tx = getStepFloat(animStartTime, speed, palette.numColors);
    AlaColor c = palette.getPalColor(tx);

    for(int x=0; x<numLeds; x++)
    {
        int k = ((x==(numLeds-1-t) ? 1:0));
        leds[x] = c.scale(k);
    }
}

// Bounce back and forth
void AlaLedRgb::pixelBounce()
{
    int t = getStep(animStartTime, speed, 2*numLeds-2);
    float tx = getStepFloat(animStartTime, speed, palette.numColors);
    AlaColor c = palette.getPalColor(tx);

    for(int x=0; x<numLeds; x++)
    {
        int k = x==(-abs(t-numLeds+1)+numLeds-1) ? 1:0;
        leds[x] = c.scale(k);
    }
}

void AlaLedRgb::pixelSmoothShiftRight()
{
    float t = getStepFloat(animStartTime, speed, numLeds+1);
    float tx = getStepFloat(animStartTime, speed, palette.numColors);
    AlaColor c = palette.getPalColor(tx);

    for(int x=0; x<numLeds; x++)
    {
        float k = max(0, (-abs(t-1-x)+1));
        leds[x] = c.scale(k);
    }
}

void AlaLedRgb::pixelSmoothShiftLeft()
{
    float t = getStepFloat(animStartTime, speed, numLeds+1);
    float tx = getStepFloat(animStartTime, speed, palette.numColors);
    AlaColor c = palette.getPalColor(tx);

    for(int x=0; x<numLeds; x++)
    {
        float k = max(0, (-abs(numLeds-t-x)+1));
        leds[x] = c.scale(k);
    }
}

void AlaLedRgb::comet()
{
    float l = numLeds/2;  // length of the tail
    float t = getStepFloat(animStartTime, speed, 2*numLeds-l);
    float tx = getStepFloat(animStartTime, speed, palette.numColors);
    AlaColor c = palette.getPalColor(tx);

    for(int x=0; x<numLeds; x++)
    {
        float k = constrain( (((x-t)/l+1.2f))*(((x-t)<0)? 1:0), 0, 1);
        leds[x] = c.scale(k);
    }
}

void AlaLedRgb::cometCol()
{
    float l = numLeds/2;  // length of the tail
    float t = getStepFloat(animStartTime, speed, 2*numLeds-l);

    AlaColor c;
    for(int x=0; x<numLeds; x++)
    {
        float tx = mapfloat(max(t-x, 0), 0, numLeds/1.7, 0, palette.numColors-1);
        c = palette.getPalColor(tx);
        float k = constrain( (((x-t)/l+1.2f))*(((x-t)<0)? 1:0), 0, 1);
        leds[x] = c.scale(k);
    }
}

void AlaLedRgb::pixelSmoothBounce()
{
    // see larsonScanner
    float t = getStepFloat(animStartTime, speed, 2*numLeds-2);
    AlaColor c = palette.getPalColor(getStepFloat(animStartTime, speed, palette.numColors));

    for(int x=0; x<numLeds; x++)
    {
        float k = constrain((-abs(abs(t-numLeds+1)-x)+1), 0, 1);
        leds[x] = c.scale(k);
    }
}


void AlaLedRgb::larsonScanner()
{
    float l = numLeds/4;
    float t = getStepFloat(animStartTime, speed, 2*numLeds-2);
    AlaColor c = palette.getPalColor(getStepFloat(animStartTime, speed, palette.numColors));

    for(int x=0; x<numLeds; x++)
    {
        float k = constrain((-abs(abs(t-numLeds+1)-x)+l), 0, 1);
        leds[x] = c.scale(k);
    }
}

void AlaLedRgb::larsonScanner2()
{
    float l = numLeds/4;  // 2>7, 3-11, 4-14
    float t = getStepFloat(animStartTime, speed, 2*numLeds+(l*4-1));
    AlaColor c = palette.getPalColor(getStepFloat(animStartTime, speed, palette.numColors));

    for(int x=0; x<numLeds; x++)
    {

        float k = constrain((-abs(abs(t-numLeds-2*l)-x-l)+l), 0, 1);
        leds[x] = c.scale(k);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////
// Fading effects
////////////////////////////////////////////////////////////////////////////////////////////

void AlaLedRgb::fadeIn()
{
    float s = getStepFloat(animStartTime, speed, 1);
    AlaColor c = palette.colors[0].scale(s);

    for(int x=0; x<numLeds; x++)
    {
        leds[x] = c;
    }
}


void AlaLedRgb::fadeOut()
{
    float s = getStepFloat(animStartTime, speed, 1);
    AlaColor c = palette.colors[0].scale(1-s);

    for(int x=0; x<numLeds; x++)
    {
        leds[x] = c;
    }
}


void AlaLedRgb::fadeInOut()
{
    float s = getStepFloat(animStartTime, speed, 2) - 1;
    AlaColor c = palette.colors[0].scale(abs(1-abs(s)));

    for(int x=0; x<numLeds; x++)
    {
        leds[x] = c;
    }
}

void AlaLedRgb::glow()
{
    float s = getStepFloat(animStartTime, speed, TWO_PI);
    float k = (-cos(s)+1)/2;

    for(int x=0; x<numLeds; x++)
    {
        leds[x] = palette.colors[0].scale(k);
    }
}

void AlaLedRgb::plasma()
{
    float t = getStepFloat(animStartTime, speed, numLeds);

    for(int x=0; x<numLeds; x++)
    {
        AlaColor c1 = palette.getPalColor((float)((x+t)*palette.numColors)/numLeds);
        AlaColor c2 = palette.getPalColor((float)((2*x-t+numLeds)*palette.numColors)/numLeds);
        leds[x] = c1.interpolate(c2, 0.5);
    }
}


void AlaLedRgb::fadeColors()
{
    float t = getStepFloat(animStartTime, speed, palette.numColors-1);
    AlaColor c = palette.getPalColor(t);
    for(int x=0; x<numLeds; x++)
    {
        leds[x] = c;
    }

}

void AlaLedRgb::pixelsFadeColors()
{
    float t = getStepFloat(animStartTime, speed, palette.numColors);

    for(int x=0; x<numLeds; x++)
    {
        AlaColor c = palette.getPalColor(t+7*x);
        leds[x] = c;
    }
}

void AlaLedRgb::fadeColorsLoop()
{
    float t = getStepFloat(animStartTime, speed, palette.numColors);
    AlaColor c = palette.getPalColor(t);
    for(int x=0; x<numLeds; x++)
    {
        leds[x] = c;
    }
}


void AlaLedRgb::cycleColors()
{
    int t = getStep(animStartTime, speed, palette.numColors);

    for(int x=0; x<numLeds; x++)
    {
        leds[x] = palette.colors[t];
    }
}


void AlaLedRgb::movingBars()
{
    int t = getStep(animStartTime, speed, numLeds);

    for(int x=0; x<numLeds; x++)
    {
        leds[x] = palette.colors[(((t+x)*palette.numColors)/numLeds)%palette.numColors];
    }
}

void AlaLedRgb::movingGradient()
{
    float t = getStepFloat(animStartTime, speed, numLeds);

    for(int x=0; x<numLeds; x++)
    {
        leds[x] = palette.getPalColor((float)((x+t)*palette.numColors)/numLeds);
    }
}


/*******************************************************************************
* FIRE
* Porting of the famous Fire2012 effect by Mark Kriegsman.
* Actually works at 50 Hz frame rate with up to 50 pixels.
*******************************************************************************/
void AlaLedRgb::fire()
{
    // COOLING: How much does the air cool as it rises?
    // Less cooling = taller flames.  More cooling = shorter flames.
    // Default 550
    #define COOLING  600

    // SPARKING: What chance (out of 255) is there that a new spark will be lit?
    // Higher chance = more roaring fire.  Lower chance = more flickery fire.
    // Default 120, suggested range 50-200.
    #define SPARKING 120

    // Array of temperature readings at each simulation cell
    static byte *heat = NULL;

    // Initialize array if necessary
    if (heat==NULL)
        heat = new byte[numLeds];

    // Step 1.  Cool down every cell a little
    int rMax = (COOLING / numLeds) + 2;
    for(int i=0; i<numLeds; i++)
    {
        heat[i] = max(((int)heat[i]) - random(0, rMax), 0);
    }

    // Step 2.  Heat from each cell drifts 'up' and diffuses a little
    for(int k=numLeds-1; k>=3; k--)
    {
        heat[k] = ((int)heat[k - 1] + (int)heat[k - 2] + (int)heat[k - 3] ) / 3;
    }

    // Step 3.  Randomly ignite new 'sparks' of heat near the bottom
    if(random(255) < SPARKING)
    {
        int y = random(7);
        heat[y] = min(heat[y] + random(160, 255), 255);
    }

    // Step 4.  Map from heat cells to LED colors
    for(int j=0; j<numLeds; j++)
    {
        float colorindex = (float)(heat[j] * (palette.numColors-1) ) / 256;
        leds[j] = palette.getPalColor(colorindex);
    }
}

void AlaLedRgb::bouncingBalls()
{
    static long lastRefresh;

    if (pxPos==NULL)
    {
        // allocate new arrays
        pxPos = new float[palette.numColors];
        pxSpeed = new float[palette.numColors];

        for (int i=0; i<palette.numColors; i++)
        {
            pxPos[i] = ((float)random(255))/255;
            pxSpeed[i] = 0;
        }
        lastRefresh = millis();

        return; // skip the first cycle
    }

    float speedReduction = (float)(millis() - lastRefresh)/5000;
    lastRefresh = millis();

    for (int i=0; i<palette.numColors; i++)
    {
        if(pxSpeed[i]>-0.04 and pxSpeed[i]<0 and pxPos[i]>0 and pxPos[i]<0.1)
            pxSpeed[i]=(0.09)-((float)random(10)/1000);

        pxPos[i] = pxPos[i] + pxSpeed[i];
        if(pxPos[i]>=1)
        {
            pxPos[i]=1;
        }
        if(pxPos[i]<0)
        {
            pxPos[i]=-pxPos[i];
            pxSpeed[i]=-0.91*pxSpeed[i];
        }

        pxSpeed[i] = pxSpeed[i]-speedReduction;
    }

    for (int x=0; x<numLeds ; x++)
    {
        leds[x] = 0;
    }
    for (int i=0; i<palette.numColors; i++)
    {
        int p = mapfloat(pxPos[i], 0, 1, 0, numLeds-1);
        leds[p] = leds[p].sum(palette.colors[i]);
    }

}

void AlaLedRgb::bubbles()
{
    static long lastRefresh;

    if (pxPos==NULL)
    {
        // allocate new arrays
        pxPos = new float[palette.numColors];
        pxSpeed = new float[palette.numColors];

        for (int i=0; i<palette.numColors; i++)
        {
            pxPos[i] = ((float)random(255))/255;
            pxSpeed[i] = 0;
        }
        lastRefresh = millis();

        return; // skip the first cycle
    }

    float speedDelta = (float)(millis() - lastRefresh)/80000;
    lastRefresh = millis();

    for (int i=0; i<palette.numColors; i++)
    {
        //pos[i] = pos[i] + speed[i];
        if(pxPos[i]>=1)
        {
            pxPos[i]=0;
            pxSpeed[i]=0;
        }
        if(random(20)==0 and pxPos[i]==0)
        {
            pxPos[i]=0.0001;
            pxSpeed[i]=0.0001;
        }
        if(pxPos[i]>0)
        {
            pxPos[i] = pxPos[i] + pxSpeed[i];
            pxSpeed[i] = pxSpeed[i] + speedDelta;
        }
    }

    for (int x=0; x<numLeds ; x++)
    {
        leds[x] = 0;
    }
    for (int i=0; i<palette.numColors; i++)
    {
        if (pxPos[i]>0)
        {
            int p = mapfloat(pxPos[i], 0, 1, 0, numLeds-1);
            AlaColor c = palette.colors[i].scale(1-(float)random(10)/30); // add a little flickering
            leds[p] = c;
        }
    }

}
