#include "cutils/log.h"
#include "RKTtsOpus.h"
#include "utils/Log.h"
#include "utils/misc.h"
#include <cstdlib>

typedef struct {
  OpusEncoder* enc;
  OpusDecoder* dec;
  int sample_rate;
  int channels;
  int application;
  int duration;
  int opus_bitrate;
  int pcm_bitrate;
  int pcm_frame_size;
  int opus_frame_size;
} opus_st;

OpusCodec::OpusCodec(int sample_rate, int channels, int bitrate, int application) {
  if ((decoder = native_opus_decoder_create(sample_rate, channels, bitrate)) == 0) {
    ALOGW("decoder create failed");
  }
  if ((encoder = native_opus_encoder_create(sample_rate, channels, bitrate, application)) == 0) {
    ALOGW("endecoder create failed");
  }
}

long OpusCodec::native_opus_encoder_create(int sample_rate, int channels,
                                           int bitrate,
                                           int application) {
  int error;
  opus_st* encoder = (opus_st*)calloc(1, sizeof(opus_st));
  // TODO(Yorkie): check if this allocation is valid.

  encoder->enc = opus_encoder_create(sample_rate, channels, application, &error);
  if (error != OPUS_OK) {
    ALOGW("encoder create error %s\n", opus_strerror(error));
    free(encoder);
    return 0;
  } else {
    opus_encoder_ctl(encoder->enc, OPUS_SET_VBR(0));
    opus_encoder_ctl(encoder->enc, OPUS_SET_BITRATE(bitrate));

    encoder->sample_rate = sample_rate;
    encoder->channels = channels;
    encoder->application = application;
    encoder->duration = 20;
    encoder->opus_bitrate = bitrate;
    encoder->pcm_bitrate = sample_rate*channels*sizeof(opus_int16)*8;
    encoder->pcm_frame_size = encoder->duration * sample_rate / 1000;
    encoder->opus_frame_size = sizeof(opus_int16) * encoder->pcm_frame_size
                                                  * bitrate / encoder->pcm_bitrate;
    return (long)encoder;
  }
}

long OpusCodec::native_opus_decoder_create(int sample_rate, int channels, int bitrate) {
  int error;
  opus_st* decoder = (opus_st*)calloc(1, sizeof(opus_st));
  // TODO(Yorkie): check if this allocation is valid.

  decoder->dec = opus_decoder_create(sample_rate, channels, &error);
  if (error != OPUS_OK) {
    ALOGW("decoder create error %s\n", opus_strerror(error));
    free(decoder);
    return 0;
  } else {
    decoder->sample_rate = sample_rate;
    decoder->channels = channels;
    decoder->duration = 20;
    decoder->opus_bitrate = bitrate;
    decoder->pcm_bitrate = sample_rate * channels * sizeof(opus_int16) * 8;
    decoder->pcm_frame_size = decoder->duration * sample_rate / 1000;
    decoder->opus_frame_size = sizeof(opus_int16) * decoder->pcm_frame_size 
                                                  * bitrate / decoder->pcm_bitrate;

    opus_decoder_ctl(decoder->dec, OPUS_SET_BITRATE(bitrate));
    opus_decoder_ctl(decoder->dec, OPUS_SET_VBR(0));
    return (long)decoder;
  }
}

uint32_t OpusCodec::native_opus_encode(long enc, const char* in, 
                                       size_t length, unsigned char* &opus) {
  opus_st* encoder = (opus_st *)enc;
  opus_int16* pcm = (opus_int16 *)in;
  const uint32_t len = (uint32_t)length;
  uint32_t pcm_frame_size = encoder->pcm_frame_size;
  uint32_t opus_frame_size = encoder->opus_frame_size;
  uint32_t opus_length = len*opus_frame_size * sizeof(opus_int16) / pcm_frame_size;
  opus = new unsigned char[opus_length];
  ALOGV("encode len(%d), pcm_frame_size(%d) opus_frame_size(%d)", len, pcm_frame_size, opus_frame_size);

  uint32_t total_len = 0;
  int out_len = 0;
  unsigned char *opus_buf = opus;
  uint32_t encoded_size = 0;
  opus_int16 *pcm_orig = pcm;
  while (encoded_size < (len/sizeof(opus_int16)/pcm_frame_size)) {
    out_len = opus_encode(encoder->enc, pcm, pcm_frame_size, opus_buf, opus_frame_size);
    if (out_len < 0) {
      ALOGW("frame_size(%d) failed: %s", pcm_frame_size, opus_strerror(out_len));
      out_len = 0;
      break;
    } else if (out_len != (int)opus_frame_size) {
      ALOGW("Something abnormal happened out_len(%d) pcm_frame_size(%d), check it!!!",
            out_len, pcm_frame_size);
    }

    pcm += pcm_frame_size;
    opus_buf += out_len;
    total_len += out_len;
    encoded_size++;
  }
  //delete[] opus; //need release opus
  return opus_length;
}

uint32_t OpusCodec::native_opus_decode(long dec, const char* in, 
                                       size_t length, char* &pcm_out) {
  opus_st* decoder = (opus_st*)dec;
  unsigned char* opus = (unsigned char *)in;
  const int len = (const int)length;

  int opus_frame_size = decoder->opus_frame_size;
  int pcm_frame_size = decoder->pcm_frame_size;
  int compress_ratio = sizeof(opus_int16) * decoder->pcm_frame_size / decoder->opus_frame_size;
  uint32_t pcm_length = len*compress_ratio;
  opus_int16* pcm = new int16_t[pcm_length];

  ALOGD("decode len(%d), compress_ratio(%d), opus_frame_size(%d), pcm_frame_size(%d)",
        len, compress_ratio, opus_frame_size, pcm_frame_size);

  int total_len = 0;
  int decoded_size = 0;
  int out_len = 0;
  unsigned char* opus_orig = opus;
  opus_int16 *pcm_buf = pcm;
  while (decoded_size++ < (len/opus_frame_size)) {
    out_len = opus_decode(decoder->dec, opus, opus_frame_size, pcm_buf, pcm_frame_size, 0);
    if (out_len < 0) {
      ALOGW("opus decode len(%d) opus_len(%d) %s", len, opus_frame_size, opus_strerror(out_len));
      break;
    } else if (out_len != pcm_frame_size) {
      ALOGW("VBS not support!! out_len(%d) pcm_frame_size(%d)", out_len, pcm_frame_size);
      break;
    }
    opus += opus_frame_size;
    pcm_buf += out_len;
    total_len += out_len;
  }

  ALOGD("opus decoded data total len = %d", total_len);
  pcm_out = (char*)pcm;
  //return sizeof(opus_int16)*pcm_length;
  return pcm_length;
}
