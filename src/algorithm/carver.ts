import type { Orientation, Derivative, Seam, CostMatrix, CostCell } from '../types';

function copyImageData(src: ImageData): ImageData {
  const copy = new ImageData(src.width, src.height);
  copy.data.set(src.data);
  return copy;
}

function at(x: number, y: number, arrWidth: number, channels = 1): number {
  return ((y * arrWidth) + x) * channels;
}

export function greyscale(imgData: ImageData): ImageData {
  const imgDataCopy = copyImageData(imgData);
  for (let i = 0; i < imgDataCopy.data.length; i += 4) {
    const avg = Math.round(
      (0.21 * imgDataCopy.data[i]) +
      (0.72 * imgDataCopy.data[i + 1]) +
      (0.07 * imgDataCopy.data[i + 2])
    );
    imgDataCopy.data[i] = avg;
    imgDataCopy.data[i + 1] = avg;
    imgDataCopy.data[i + 2] = avg;
  }
  return imgDataCopy;
}

export function simpleGradient(imgData: ImageData): ImageData {
  const buf = new ArrayBuffer(imgData.data.length);
  const view32 = new Uint32Array(buf);
  const view8 = new Uint8ClampedArray(buf);
  const w = imgData.width;
  const h = imgData.height;
  const c = 4;
  const gsImgData = greyscale(imgData);
  const alpha = 0xff;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx32 = at(x, y, w);
      const idx = at(x, y, w, c);
      // Note: `x > 0 && y > 0` intentionally collapses left-column and top-row
      // boundary conditions together. This matches the original carver2.js behavior exactly;
      // the expected test values below were generated from this same logic.
      const lidx = (x > 0 && y > 0) ? at(x - 1, y, w, c) : idx;
      const uidx = (x > 0 && y > 0) ? at(x, y - 1, w, c) : idx;
      const dx = gsImgData.data[idx] - gsImgData.data[lidx];
      const dy = gsImgData.data[idx] - gsImgData.data[uidx];
      const mag = Math.sqrt(dx * dx + dy * dy) & 0xff;
      view32[idx32] = (alpha << 24) | (mag << 16) | (mag << 8) | mag;
    }
  }
  return new ImageData(view8, w, h);
}

export function sobelGradient(imgData: ImageData): ImageData {
  const buf = new ArrayBuffer(imgData.data.length);
  const view32 = new Uint32Array(buf);
  const view8 = new Uint8ClampedArray(buf);
  const w = imgData.width;
  const h = imgData.height;
  const c = 4;
  const gsImgData = greyscale(imgData);
  const alpha = 0xff;

  const kernelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const kernelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const dx =
        kernelX[0][0] * gsImgData.data[at(x - 1, y - 1, w, c)] +
        kernelX[0][1] * gsImgData.data[at(x,     y - 1, w, c)] +
        kernelX[0][2] * gsImgData.data[at(x + 1, y - 1, w, c)] +
        kernelX[1][0] * gsImgData.data[at(x - 1, y,     w, c)] +
        kernelX[1][1] * gsImgData.data[at(x,     y,     w, c)] +
        kernelX[1][2] * gsImgData.data[at(x + 1, y,     w, c)] +
        kernelX[2][0] * gsImgData.data[at(x - 1, y + 1, w, c)] +
        kernelX[2][1] * gsImgData.data[at(x,     y + 1, w, c)] +
        kernelX[2][2] * gsImgData.data[at(x + 1, y + 1, w, c)];
      const dy =
        kernelY[0][0] * gsImgData.data[at(x - 1, y - 1, w, c)] +
        kernelY[0][1] * gsImgData.data[at(x,     y - 1, w, c)] +
        kernelY[0][2] * gsImgData.data[at(x + 1, y - 1, w, c)] +
        kernelY[1][0] * gsImgData.data[at(x - 1, y,     w, c)] +
        kernelY[1][1] * gsImgData.data[at(x,     y,     w, c)] +
        kernelY[1][2] * gsImgData.data[at(x + 1, y,     w, c)] +
        kernelY[2][0] * gsImgData.data[at(x - 1, y + 1, w, c)] +
        kernelY[2][1] * gsImgData.data[at(x,     y + 1, w, c)] +
        kernelY[2][2] * gsImgData.data[at(x + 1, y + 1, w, c)];
      const mag = Math.sqrt(dx * dx + dy * dy) & 0xff;
      view32[at(x, y, w)] = (alpha << 24) | (mag << 16) | (mag << 8) | mag;
    }
  }
  return new ImageData(view8, w, h);
}
