import type { Derivative } from '../types';
import { resize as tsResize } from '../algorithm/carver';

export interface DispatchRequest {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  derivative: Derivative;
  targetWidth: number;
  targetHeight: number;
  engine: 'ts' | 'wasm';
}

export interface DispatchResult {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  elapsed: number;
  engineUsed: 'ts' | 'wasm';
}

export type WasmResize = (
  pixels: Uint8Array,
  width: number,
  height: number,
  derivative: string,
  targetWidth: number,
  targetHeight: number,
) => Uint8Array;

/**
 * Pure dispatch: runs the requested engine when available, otherwise falls back to TS.
 * `wasm` is null when WASM is unavailable or still initializing.
 * `engineUsed` reports which engine actually ran, so callers can detect fallback.
 */
export function dispatchResize(req: DispatchRequest, wasm: WasmResize | null): DispatchResult {
  const { buffer, width, height, derivative, targetWidth, targetHeight, engine } = req;
  const start = performance.now();
  let resultBuffer: ArrayBuffer;
  let resultWidth: number;
  let resultHeight: number;
  let engineUsed: 'ts' | 'wasm';

  if (engine === 'wasm' && wasm) {
    const pixels = new Uint8Array(buffer);
    const result = wasm(pixels, width, height, derivative, targetWidth, targetHeight);
    resultWidth = Math.min(width, targetWidth);
    resultHeight = Math.min(height, targetHeight);
    resultBuffer = result.buffer as ArrayBuffer;
    engineUsed = 'wasm';
  } else {
    const srcImageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const result = tsResize(srcImageData, derivative, targetWidth, targetHeight);
    resultWidth = result.width;
    resultHeight = result.height;
    resultBuffer = result.data.buffer;
    engineUsed = 'ts';
  }

  const elapsed = Math.round(performance.now() - start);
  return { buffer: resultBuffer, width: resultWidth, height: resultHeight, elapsed, engineUsed };
}
