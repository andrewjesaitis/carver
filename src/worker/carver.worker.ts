/// <reference lib="webworker" />
/**
 * Web Worker that runs seam carving off the main thread.
 * Dispatches between TS and WASM engines — see dispatch.ts for the pure logic.
 */

import type {
  ResizeRequest,
  ResizeResponse,
  ResizeError,
  WasmStatus,
  VisualizeInit,
  VisualizeSeek,
  VisualizeReady,
  VisualizeFrameMsg,
  VisualizeError,
} from '../types';
import init, { resize as wasmResize } from '../wasm/pkg/carver_wasm.js';
import wasmUrl from '../wasm/pkg/carver_wasm_bg.wasm?url';
import { dispatchResize, type WasmResize } from './dispatch';
import { initViz, seekViz, computeTotalSeams, type VizSeekState } from './viz-dispatch';

let wasm: WasmResize | null = null;
let vizState: VizSeekState | null = null;

init(wasmUrl)
  .then(() => {
    wasm = wasmResize;
    self.postMessage({ type: 'WASM_STATUS', available: true } satisfies WasmStatus);
  })
  .catch((err: unknown) => {
    console.error('[carver-worker] WASM init failed:', err);
    self.postMessage({ type: 'WASM_STATUS', available: false } satisfies WasmStatus);
  });

self.onmessage = (event: MessageEvent<ResizeRequest | VisualizeInit | VisualizeSeek>) => {
  const msg = event.data;

  if (msg.type === 'RESIZE') {
    try {
      const result = dispatchResize(msg, wasm);
      const response: ResizeResponse = {
        type: 'RESIZE',
        buffer: result.buffer,
        width: result.width,
        height: result.height,
        elapsed: result.elapsed,
      };
      self.postMessage(response, [response.buffer]);
    } catch (err) {
      const { engine, width, height, targetWidth, targetHeight } = msg;
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
    return;
  }

  if (msg.type === 'VISUALIZE_INIT') {
    try {
      vizState = initViz(
        msg.buffer,
        msg.width,
        msg.height,
        msg.derivative,
        msg.targetWidth,
        msg.targetHeight,
      );
      const totalSeams = computeTotalSeams(
        msg.width,
        msg.height,
        msg.targetWidth,
        msg.targetHeight,
      );
      self.postMessage({ type: 'VISUALIZE_READY', totalSeams } satisfies VisualizeReady);
    } catch (err) {
      console.error('[carver-worker] VISUALIZE_INIT failed:', err);
      self.postMessage({
        type: 'VISUALIZE_ERROR',
        message: err instanceof Error ? err.message : String(err),
      } satisfies VisualizeError);
    }
    return;
  }

  if (msg.type === 'VISUALIZE_SEEK') {
    if (!vizState) return;
    try {
      const { state, frame } = seekViz(vizState, msg.seam);
      vizState = state;
      const response: VisualizeFrameMsg = {
        type: 'VISUALIZE_FRAME',
        seam: frame.seam,
        imageBuffer: frame.imageData.data.buffer,
        greyscaleBuffer: frame.greyscaleMap.data.buffer,
        energyBuffer: frame.energyMap.data.buffer,
        costBuffer: frame.costHeatmap.data.buffer,
        width: frame.imageData.width,
        height: frame.imageData.height,
        seamPath: frame.seamPath,
        kernelSample: frame.kernelSample,
        costDetail: frame.costDetail,
      };
      self.postMessage(response, [
        response.imageBuffer,
        response.greyscaleBuffer,
        response.energyBuffer,
        response.costBuffer,
      ]);
    } catch (err) {
      console.error('[carver-worker] VISUALIZE_SEEK failed:', err);
      self.postMessage({
        type: 'VISUALIZE_ERROR',
        message: err instanceof Error ? err.message : String(err),
      } satisfies VisualizeError);
    }
  }
};
