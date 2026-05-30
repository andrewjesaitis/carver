import { describe, test, expect } from 'vitest';
import { formatMs, computeSpeedup } from './timing';

describe('formatMs', () => {
  test('sub-second values render as integer ms', () => {
    expect(formatMs(42)).toBe('42 ms');
    expect(formatMs(999)).toBe('999 ms');
  });

  test('one-second-plus values render as s with one decimal', () => {
    expect(formatMs(1000)).toBe('1.0 s');
    expect(formatMs(4321)).toBe('4.3 s');
    expect(formatMs(10000)).toBe('10.0 s');
  });

  test('sub-second values round to nearest integer', () => {
    expect(formatMs(42.4)).toBe('42 ms');
    expect(formatMs(42.6)).toBe('43 ms');
  });
});

describe('computeSpeedup', () => {
  test('divides ts by wasm and formats with one decimal and × suffix', () => {
    expect(computeSpeedup(50, 500)).toBe('10.0×');
    expect(computeSpeedup(42, 380)).toBe('9.0×');
  });

  test('rounds to one decimal', () => {
    expect(computeSpeedup(3, 10)).toBe('3.3×');
  });
});
