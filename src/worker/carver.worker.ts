/// <reference lib="webworker" />

import type { ResizeRequest, ResizeResponse, ResizeError } from '../types';
import { resize } from '../algorithm/carver';

self.onmessage = (event: MessageEvent<ResizeRequest>) => {
  try {
    const { buffer, width, height, derivative, targetWidth, targetHeight } = event.data;
    const srcImageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const result = resize(srcImageData, derivative, targetWidth, targetHeight);

    const response: ResizeResponse = {
      type: 'RESIZE',
      buffer: result.data.buffer,
      width: result.width,
      height: result.height,
    };
    self.postMessage(response, [response.buffer]);
  } catch (err) {
    const error: ResizeError = {
      type: 'RESIZE_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
