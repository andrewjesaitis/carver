/// <reference lib="webworker" />
/**
 * Web Worker that runs seam carving off the main thread.
 * Supports both TS and WASM engines, dispatched via the `engine` field.
 */

import type { ResizeRequest, ResizeResponse, ResizeError, WasmStatus } from '../types';
import { resize as tsResize } from '../algorithm/carver';
import init, { resize as wasmResize } from '../wasm/pkg/carver_wasm.js';
import wasmUrl from '../wasm/pkg/carver_wasm_bg.wasm?url';

let wasmReady = false;

// Initialize WASM on worker startup
init(wasmUrl)
  .then(() => {
    wasmReady = true;
    self.postMessage({ type: 'WASM_STATUS', available: true } satisfies WasmStatus);
  })
  .catch(() => {
    self.postMessage({ type: 'WASM_STATUS', available: false } satisfies WasmStatus);
  });

self.onmessage = (event: MessageEvent<ResizeRequest>) => {
  try {
    const { buffer, width, height, derivative, targetWidth, targetHeight, engine } = event.data;

    const start = performance.now();
    let resultBuffer: ArrayBuffer;
    let resultWidth: number;
    let resultHeight: number;

    if (engine === 'wasm' && wasmReady) {
      const pixels = new Uint8Array(buffer);
      const result = wasmResize(pixels, width, height, derivative, targetWidth, targetHeight);
      resultWidth = Math.min(width, targetWidth);
      resultHeight = Math.min(height, targetHeight);
      resultBuffer = result.buffer as ArrayBuffer;
    } else {
      const srcImageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
      const result = tsResize(srcImageData, derivative, targetWidth, targetHeight);
      resultWidth = result.width;
      resultHeight = result.height;
      resultBuffer = result.data.buffer;
    }

    const elapsed = Math.round(performance.now() - start);

    const response: ResizeResponse = {
      type: 'RESIZE',
      buffer: resultBuffer,
      width: resultWidth,
      height: resultHeight,
      elapsed,
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
