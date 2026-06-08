import { describe, it, expect } from 'vitest';
import { initViz, seekViz, computeTotalSeams } from './viz-dispatch';

function makePixels(w: number, h: number): ArrayBuffer {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 37) % 256;
  return data.buffer;
}

describe('computeTotalSeams', () => {
  it('sums width and height deltas', () => {
    expect(computeTotalSeams(10, 8, 7, 5)).toBe(6);
  });

  it('returns 0 when already at target', () => {
    expect(computeTotalSeams(10, 8, 10, 8)).toBe(0);
  });
});

describe('seekViz', () => {
  it('returns seam 0 on first seek', () => {
    const state = initViz(makePixels(10, 8), 10, 8, 'sobel', 7, 8);
    const { frame } = seekViz(state, 0);
    expect(frame.seam).toBe(0);
    expect(frame.imageData.width).toBe(10);
  });

  it('advances forward through multiple seams', () => {
    let state = initViz(makePixels(10, 8), 10, 8, 'sobel', 7, 8);
    let result = seekViz(state, 0);
    result = seekViz(result.state, 1);
    result = seekViz(result.state, 2);
    expect(result.frame.seam).toBe(2);
    expect(result.frame.imageData.width).toBe(8);
  });

  it('backward seek returns the correct frame', () => {
    let state = initViz(makePixels(10, 8), 10, 8, 'sobel', 7, 8);
    let result = seekViz(state, 0);
    result = seekViz(result.state, 2);
    // Seek back to 0
    result = seekViz(result.state, 0);
    expect(result.frame.seam).toBe(0);
    expect(result.frame.imageData.width).toBe(10);
  });

  it('backward seek reproduces the original frame byte-for-byte', () => {
    const state = initViz(makePixels(10, 8), 10, 8, 'sobel', 6, 8);
    const fwd0 = seekViz(state, 0);
    const data0 = Array.from(fwd0.frame.imageData.data);
    let result = seekViz(fwd0.state, 2);
    result = seekViz(result.state, 0); // generator restarts from the original
    expect(result.frame.seam).toBe(0);
    expect(Array.from(result.frame.imageData.data)).toEqual(data0);
  });

  it('mid-range backward seek equals a fresh forward seek to the same index', () => {
    const fresh = seekViz(initViz(makePixels(10, 8), 10, 8, 'sobel', 6, 8), 1);
    const expected = Array.from(fresh.frame.imageData.data);

    let result = seekViz(initViz(makePixels(10, 8), 10, 8, 'sobel', 6, 8), 3);
    result = seekViz(result.state, 1);
    expect(result.frame.seam).toBe(1);
    expect(Array.from(result.frame.imageData.data)).toEqual(expected);
  });

  it('throws when seeking past totalSeams', () => {
    const state = initViz(makePixels(10, 8), 10, 8, 'sobel', 7, 8);
    // 3 total seams (width: 10→7), seeking to 99 should throw
    expect(() => seekViz(state, 99)).toThrow();
  });
});
