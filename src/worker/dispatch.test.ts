import { describe, test, expect, vi } from 'vitest';
import { dispatchResize, type DispatchRequest, type WasmResize } from './dispatch';

const testPixels = new Uint8ClampedArray([
  238, 226, 86, 255, 255, 252, 96, 255, 255, 255, 109, 255, 255, 255, 117, 255,
  84, 83, 58, 255, 131, 131, 80, 255, 151, 150, 76, 255, 196, 193, 68, 255,
  73, 75, 77, 255, 68, 69, 76, 255, 41, 43, 55, 255, 30, 25, 17, 255,
  28, 28, 26, 255, 28, 29, 25, 255, 0, 0, 17, 255, 159, 138, 26, 255,
]);

function makeRequest(engine: 'ts' | 'wasm'): DispatchRequest {
  return {
    buffer: testPixels.slice().buffer,
    width: 4,
    height: 4,
    derivative: 'sobel',
    targetWidth: 3,
    targetHeight: 3,
    engine,
  };
}

describe('dispatchResize', () => {
  test("runs TS when engine='ts'", () => {
    const wasm = vi.fn<Parameters<WasmResize>, ReturnType<WasmResize>>();
    const result = dispatchResize(makeRequest('ts'), wasm);
    expect(result.engineUsed).toBe('ts');
    expect(wasm).not.toHaveBeenCalled();
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  test("runs WASM when engine='wasm' and wasm is provided", () => {
    const wasmOutput = new Uint8Array(3 * 3 * 4);
    const wasm = vi.fn<Parameters<WasmResize>, ReturnType<WasmResize>>(() => wasmOutput);
    const result = dispatchResize(makeRequest('wasm'), wasm);
    expect(result.engineUsed).toBe('wasm');
    expect(wasm).toHaveBeenCalledOnce();
    expect(wasm).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      4,
      4,
      'sobel',
      3,
      3,
    );
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  test("falls back to TS when engine='wasm' but wasm is null", () => {
    const result = dispatchResize(makeRequest('wasm'), null);
    expect(result.engineUsed).toBe('ts');
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  test('propagates errors thrown by the WASM engine', () => {
    const wasm = vi.fn<Parameters<WasmResize>, ReturnType<WasmResize>>(() => {
      throw new Error('wasm boom');
    });
    expect(() => dispatchResize(makeRequest('wasm'), wasm)).toThrow('wasm boom');
  });

  test('reports non-negative elapsed time', () => {
    const result = dispatchResize(makeRequest('ts'), null);
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
  });
});
