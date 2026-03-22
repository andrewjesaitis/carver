/// <reference types="vitest/globals" />
import { describe, test, expect } from 'vitest';
import {
  greyscale,
  simpleGradient,
  sobelGradient,
  computeCostMatrix,
  findSeam,
  ripSeam,
} from './carver';
import type { CostMatrix, Seam } from '../types';

const testImgArr = new Uint8ClampedArray([
  238, 226, 86, 255, 255, 252, 96, 255, 255, 255, 109, 255, 255, 255, 117, 255, 84, 83, 58, 255,
  131, 131, 80, 255, 151, 150, 76, 255, 196, 193, 68, 255, 73, 75, 77, 255, 68, 69, 76, 255, 41, 43,
  55, 255, 30, 25, 17, 255, 28, 28, 26, 255, 28, 29, 25, 255, 0, 0, 17, 255, 159, 138, 26, 255,
]);
const testImgData = new ImageData(testImgArr, 4, 4);

describe('greyscale', () => {
  test('converts RGBA image to greyscale using luminance weights', () => {
    const result = greyscale(testImgData);
    const expected = new ImageData(
      new Uint8ClampedArray([
        219, 219, 219, 255, 242, 242, 242, 255, 245, 245, 245, 255, 245, 245, 245, 255, 81, 81, 81,
        255, 127, 127, 127, 255, 145, 145, 145, 255, 185, 185, 185, 255, 75, 75, 75, 255, 69, 69,
        69, 255, 43, 43, 43, 255, 25, 25, 25, 255, 28, 28, 28, 255, 29, 29, 29, 255, 1, 1, 1, 255,
        135, 135, 135, 255,
      ]),
      4,
      4,
    );
    expect(result).toEqual(expected);
  });
});

describe('simpleGradient', () => {
  test('computes simple forward-difference gradient magnitude', () => {
    const result = simpleGradient(testImgData);
    const expected = new ImageData(
      new Uint8ClampedArray([
        0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 123, 123, 123, 255,
        101, 101, 101, 255, 72, 72, 72, 255, 0, 0, 0, 255, 58, 58, 58, 255, 105, 105, 105, 255, 161,
        161, 161, 255, 0, 0, 0, 255, 40, 40, 40, 255, 50, 50, 50, 255, 173, 173, 173, 255,
      ]),
      4,
      4,
    );
    expect(result).toEqual(expected);
  });
});

describe('sobelGradient', () => {
  test('computes Sobel gradient magnitude', () => {
    const result = sobelGradient(testImgData);
    const expected = new ImageData(
      new Uint8ClampedArray([
        0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 190, 190, 190, 255,
        32, 32, 32, 255, 252, 252, 252, 255, 35, 35, 35, 255, 137, 137, 137, 255, 186, 186, 186,
        255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
      ]),
      4,
      4,
    );
    expect(result).toEqual(expected);
  });
});

// Sobel gradient of the 4×4 fixture — used as input for cost matrix tests
const sobelGradImg = new ImageData(
  new Uint8ClampedArray([
    0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 190, 190, 190, 255, 32,
    32, 32, 255, 252, 252, 252, 255, 35, 35, 35, 255, 137, 137, 137, 255, 186, 186, 186, 255, 0, 0,
    0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
  ]),
  4,
  4,
);

describe('computeCostMatrix', () => {
  test('computes vertical cost matrix using dynamic programming', () => {
    const result = computeCostMatrix(sobelGradImg, 'vertical');
    const expected: CostMatrix = [
      [
        { current: { cost: 0, x: 0, y: 0 }, minNeighbor: null },
        { current: { cost: 0, x: 0, y: 1 }, minNeighbor: { cost: 0, x: 1, y: 0 } },
        { current: { cost: 35, x: 0, y: 2 }, minNeighbor: { cost: 0, x: 0, y: 1 } },
        { current: { cost: 35, x: 0, y: 3 }, minNeighbor: { cost: 35, x: 0, y: 2 } },
      ],
      [
        { current: { cost: 0, x: 1, y: 0 }, minNeighbor: null },
        { current: { cost: 190, x: 1, y: 1 }, minNeighbor: { cost: 0, x: 2, y: 0 } },
        { current: { cost: 137, x: 1, y: 2 }, minNeighbor: { cost: 0, x: 0, y: 1 } },
        { current: { cost: 35, x: 1, y: 3 }, minNeighbor: { cost: 35, x: 0, y: 2 } },
      ],
      [
        { current: { cost: 0, x: 2, y: 0 }, minNeighbor: null },
        { current: { cost: 32, x: 2, y: 1 }, minNeighbor: { cost: 0, x: 3, y: 0 } },
        { current: { cost: 218, x: 2, y: 2 }, minNeighbor: { cost: 32, x: 2, y: 1 } },
        { current: { cost: 32, x: 2, y: 3 }, minNeighbor: { cost: 32, x: 3, y: 2 } },
      ],
      [
        { current: { cost: 0, x: 3, y: 0 }, minNeighbor: null },
        { current: { cost: 252, x: 3, y: 1 }, minNeighbor: { cost: 0, x: 3, y: 0 } },
        { current: { cost: 32, x: 3, y: 2 }, minNeighbor: { cost: 32, x: 2, y: 1 } },
        { current: { cost: 32, x: 3, y: 3 }, minNeighbor: { cost: 32, x: 3, y: 2 } },
      ],
    ];
    expect(result).toEqual(expected);
  });

  test('computes horizontal cost matrix using dynamic programming', () => {
    const result = computeCostMatrix(sobelGradImg, 'horizontal');
    const expected: CostMatrix = [
      [
        { current: { cost: 0, x: 0, y: 0 }, minNeighbor: null },
        { current: { cost: 0, x: 0, y: 1 }, minNeighbor: null },
        { current: { cost: 35, x: 0, y: 2 }, minNeighbor: null },
        { current: { cost: 0, x: 0, y: 3 }, minNeighbor: null },
      ],
      [
        { current: { cost: 0, x: 1, y: 0 }, minNeighbor: { cost: 0, x: 0, y: 1 } },
        { current: { cost: 190, x: 1, y: 1 }, minNeighbor: { cost: 0, x: 0, y: 1 } },
        { current: { cost: 137, x: 1, y: 2 }, minNeighbor: { cost: 0, x: 0, y: 3 } },
        { current: { cost: 0, x: 1, y: 3 }, minNeighbor: { cost: 0, x: 0, y: 3 } },
      ],
      [
        { current: { cost: 0, x: 2, y: 0 }, minNeighbor: { cost: 0, x: 1, y: 0 } },
        { current: { cost: 32, x: 2, y: 1 }, minNeighbor: { cost: 0, x: 1, y: 0 } },
        { current: { cost: 186, x: 2, y: 2 }, minNeighbor: { cost: 0, x: 1, y: 3 } },
        { current: { cost: 0, x: 2, y: 3 }, minNeighbor: { cost: 0, x: 1, y: 3 } },
      ],
      [
        { current: { cost: 0, x: 3, y: 0 }, minNeighbor: { cost: 0, x: 2, y: 0 } },
        { current: { cost: 252, x: 3, y: 1 }, minNeighbor: { cost: 0, x: 2, y: 0 } },
        { current: { cost: 0, x: 3, y: 2 }, minNeighbor: { cost: 0, x: 2, y: 3 } },
        { current: { cost: 0, x: 3, y: 3 }, minNeighbor: { cost: 0, x: 2, y: 3 } },
      ],
    ];
    expect(result).toEqual(expected);
  });
});

describe('findSeam', () => {
  test('finds lowest-cost vertical seam end-to-end', () => {
    const result = findSeam('vertical', sobelGradImg);
    expect(result).toEqual([
      { x: 3, y: 3 },
      { x: 3, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 0 },
    ]);
  });

  test('finds lowest-cost horizontal seam end-to-end', () => {
    const result = findSeam('horizontal', sobelGradImg);
    expect(result).toEqual([
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
    ]);
  });
});

describe('ripSeam', () => {
  test('removes a vertical seam producing a 3×4 image', () => {
    const vertSeam: Seam = [
      { x: 2, y: 3 },
      { x: 3, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 0 },
    ];
    const result = ripSeam(vertSeam, 'vertical', testImgData);
    const expected = new ImageData(
      new Uint8ClampedArray([
        238, 226, 86, 255, 255, 252, 96, 255, 255, 255, 109, 255, 84, 83, 58, 255, 131, 131, 80,
        255, 196, 193, 68, 255, 73, 75, 77, 255, 68, 69, 76, 255, 41, 43, 55, 255, 28, 28, 26, 255,
        28, 29, 25, 255, 159, 138, 26, 255,
      ]),
      3,
      4,
    );
    expect(result).toEqual(expected);
  });

  test('removes a horizontal seam producing a 4×3 image', () => {
    const horzSeam: Seam = [
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    const result = ripSeam(horzSeam, 'horizontal', testImgData);
    const expected = new ImageData(
      new Uint8ClampedArray([
        238, 226, 86, 255, 131, 131, 80, 255, 151, 150, 76, 255, 196, 193, 68, 255, 73, 75, 77, 255,
        68, 69, 76, 255, 41, 43, 55, 255, 30, 25, 17, 255, 28, 28, 26, 255, 28, 29, 25, 255, 0, 0,
        17, 255, 159, 138, 26, 255,
      ]),
      4,
      3,
    );
    expect(result).toEqual(expected);
  });
});
