#include <math.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <emscripten.h>

int at(x, y, width, channels) {
  return ((y * width) + x) * channels;
}

void grayscale(unsigned char* data, unsigned char* gsData, int len) {
  for (int i = 0; i < len; i += 4) {
    int r = data[i];
    int g = data[i+1];
    int b = data[i+2];
    int a = data[i+3];
    int val = (r*.21+g*.72+b*.07);

    gsData[i] = val;
    gsData[i+1] = val;
    gsData[i+2] = val;
    gsData[i+3] = a;
  }
}

void simpleGradiant(unsigned char* data, unsigned char* gradData, int w, int h) {
  int len = w * h * 4;
  unsigned char gsData[len];
  grayscale(data, gsData, len);

  for (int x = 0; x < w; x++) {
    for (int y = 0; y < h; y++) {

      // calculate indicies in 4 channel image
      int idx = at(x, y, w, 4);
      int lidx = idx;
      int uidx = idx;
      if (x > 0 && y > 0) {
        lidx = at(x-1, y, w, 4);
        uidx = at(x, y-1, w, 4);
      }

      // get neighbors
      int curPix = gsData[idx];
      int leftPix = gsData[lidx];
      int upPix = gsData[uidx];

      // calculate gradiant which is the sum of squared differentials
      int dx = curPix - leftPix;
      int dy = curPix - upPix;
      int mag = ((int) sqrt(pow(dx, 2) + pow(dy, 2)));

      // update image
      gradData[idx] = mag;
      gradData[idx + 1] = mag;
      gradData[idx + 2] = mag;
      // skip grdData[idx + 3] (ie alpha channel)
    }
  }
}

EMSCRIPTEN_KEEPALIVE
void calculateDisplayImage(unsigned char* data, int display, int derivative,
                           int orientaion, int w, int h) {
  int len = w * h * 4;
  unsigned char input[len];
  memcpy(input, data, len);
  simpleGradiant(input, data, w, h);
}

EMSCRIPTEN_KEEPALIVE
void resize(unsigned char* data, char* derivative, int width, int height) {
}

EMSCRIPTEN_KEEPALIVE
int add(int a, int b) {
  return a + b;
}
