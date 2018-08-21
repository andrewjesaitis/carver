/* #include <math.h> */
/* #include <stdlib.h> */
/* #include <stdio.h> */
/* #include <string.h> */
/* #include <emscripten.h> */

/* void grayscale(unsigned char* data, int len) { */
/*   for (int i = 0; i < len; i++) { */
/*     int r = data[i]; */
/*     int g = data[i+1]; */
/*     int b = data[i+2]; */
/*     int a = data[i+3]; */
/*     int val = (r*.21+g*.72+b*.07); */

/*     data[i] = val; */
/*     data[i+1] = val; */
/*     data[i+2] = val; */
/*     data[i+3] = a; */
/*   } */
/* } */

/* EMSCRIPTEN_KEEPALIVE */
/* void calculateDisplayImage(unsigned char* data, int display, int derivative, */
/*                            int orientaion, int len) { */
/*   grayscale(data, len); */
/* } */

/* EMSCRIPTEN_KEEPALIVE */
/* void resize(unsigned char* data, char* derivative, int width, int height) { */
/* } */
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int a, int b) {
  return a + b;
}
