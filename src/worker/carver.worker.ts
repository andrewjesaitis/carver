/// <reference lib="webworker" />
/**
 * Web Worker that runs seam carving off the main thread.
 * Dispatches between TS and WASM engines — see dispatch.ts for the pure logic.
 */

import type { ResizeRequest, ResizeResponse, ResizeError, WasmStatus } from '../types';
import init, { resize as wasmResize } from '../wasm/pkg/carver_wasm.js';
import wasmUrl from '../wasm/pkg/carver_wasm_bg.wasm?url';
import { dispatchResize, type WasmResize } from './dispatch';

let wasm: WasmResize | null = null;

init(wasmUrl)
  .then(() => {
    wasm = wasmResize;
    self.postMessage({ type: 'WASM_STATUS', available: true } satisfies WasmStatus);
  })
  .catch((err) => {
    console.error('[carver-worker] WASM init failed:', err);
    self.postMessage({ type: 'WASM_STATUS', available: false } satisfies WasmStatus);
  });

self.onmessage = (event: MessageEvent<ResizeRequest>) => {
  try {
    const result = dispatchResize(event.data, wasm);
    const response: ResizeResponse = {
      type: 'RESIZE',
      buffer: result.buffer,
      width: result.width,
      height: result.height,
      elapsed: result.elapsed,
    };
    self.postMessage(response, [response.buffer]);
  } catch (err) {
    const { engine, width, height, targetWidth, targetHeight } = event.data;
    console.error(
      `[carver-worker] resize failed engine=${engine} ${width}x${height}->${targetWidth}x${targetHeight}:`,
      err,
    );
    const error: ResizeError = {
      type: 'RESIZE_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
