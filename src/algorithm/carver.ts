import type { Orientation, Derivative, Seam, CostMatrix, CostCell } from '../types';

function copyImageData(src: ImageData): ImageData {
  const copy = new ImageData(src.width, src.height);
  copy.data.set(src.data);
  return copy;
}

function at(x: number, y: number, arrWidth: number, channels = 1): number {
  return ((y * arrWidth) + x) * channels;
}

/** Converts an RGBA image to greyscale using luminance weights (0.21R + 0.72G + 0.07B). */
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

/**
 * Computes a gradient image using simple forward differences (dx, dy) on the greyscale image.
 * Magnitude is clamped to [0, 255]. Left column and top row are treated as zero-gradient
 * boundaries (matches original carver2.js behavior).
 */
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

/**
 * Computes a gradient image using the Sobel operator on the greyscale image.
 * Out-of-bounds pixel reads return 0 (Uint8ClampedArray behavior), which gives
 * zero-gradient borders — matches original carver2.js behavior.
 */
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

function getCost(x: number, y: number, costMatrix: CostMatrix): { x: number; y: number; cost: number } {
  return { x, y, cost: costMatrix[x][y].current.cost };
}

function getMinNeighbor(
  x: number, y: number, orientation: Orientation, costMatrix: CostMatrix
): ({ x: number; y: number; cost: number }) | null {
  let n1, n2, n3;
  if (orientation === 'vertical') {
    if (y === 0) return null;
    if (x === 0) {
      n1 = getCost(x, y - 1, costMatrix);
      n2 = getCost(x + 1, y - 1, costMatrix);
      return n1.cost < n2.cost ? n1 : n2;
    }
    if (x === costMatrix.length - 1) {
      n1 = getCost(x - 1, y - 1, costMatrix);
      n2 = getCost(x, y - 1, costMatrix);
      return n1.cost < n2.cost ? n1 : n2;
    }
    n1 = getCost(x - 1, y - 1, costMatrix);
    n2 = getCost(x, y - 1, costMatrix);
    n3 = getCost(x + 1, y - 1, costMatrix);
    const min12 = n1.cost < n2.cost ? n1 : n2;
    return min12.cost < n3.cost ? min12 : n3;
  } else {
    if (x === 0) return null;
    if (y === 0) {
      n1 = getCost(x - 1, y, costMatrix);
      n2 = getCost(x - 1, y + 1, costMatrix);
      return n1.cost < n2.cost ? n1 : n2;
    }
    if (y === costMatrix[0].length - 1) {
      n1 = getCost(x - 1, y - 1, costMatrix);
      n2 = getCost(x - 1, y, costMatrix);
      return n1.cost < n2.cost ? n1 : n2;
    }
    n1 = getCost(x - 1, y - 1, costMatrix);
    n2 = getCost(x - 1, y, costMatrix);
    n3 = getCost(x - 1, y + 1, costMatrix);
    const min12 = n1.cost < n2.cost ? n1 : n2;
    return min12.cost < n3.cost ? min12 : n3;
  }
}

function computeCost(
  x: number, y: number, orientation: Orientation, gradData: ImageData, costMatrix: CostMatrix
): CostCell {
  const cost = gradData.data[at(x, y, gradData.width, 4)];
  if ((y === 0 && orientation === 'vertical') || (x === 0 && orientation === 'horizontal')) {
    return { current: { x, y, cost }, minNeighbor: null };
  }
  const minNeighbor = getMinNeighbor(x, y, orientation, costMatrix)!;
  return { current: { x, y, cost: cost + minNeighbor.cost }, minNeighbor };
}

/**
 * Builds a cumulative cost matrix via dynamic programming over the gradient image.
 * For `'vertical'` orientation, costs accumulate top-to-bottom (seams run vertically).
 * For `'horizontal'`, costs accumulate left-to-right (seams run horizontally).
 * Each cell stores its cumulative cost and a pointer to its minimum-cost neighbor.
 */
export function computeCostMatrix(gradData: ImageData, orientation: Orientation): CostMatrix {
  const w = gradData.width;
  const h = gradData.height;
  const costMatrix: CostMatrix = Array.from({ length: w }, (_, i) =>
    Array.from({ length: h }, (_, j) => ({
      current: { x: i, y: j, cost: 255 },
      minNeighbor: null,
    }))
  );
  if (orientation === 'horizontal') {
    for (let i = 0; i < w; i++)
      for (let j = 0; j < h; j++)
        costMatrix[i][j] = computeCost(i, j, orientation, gradData, costMatrix);
  } else {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++)
        costMatrix[i][j] = computeCost(i, j, orientation, gradData, costMatrix);
  }
  return costMatrix;
}

function getBottomEdgeMin(costMatrix: CostMatrix): CostCell {
  const lastRowIdx = costMatrix[0].length - 1;
  return costMatrix
    .map(col => col[lastRowIdx])
    .reduce((a, b) => (a.current.cost < b.current.cost ? a : b));
}

function getRightEdgeMin(costMatrix: CostMatrix): CostCell {
  const lastColIdx = costMatrix.length - 1;
  return costMatrix[lastColIdx]
    .reduce((a, b) => (a.current.cost < b.current.cost ? a : b));
}

function computeSeam(orientation: Orientation, costMatrix: CostMatrix): Seam {
  const minCost = orientation === 'vertical'
    ? getBottomEdgeMin(costMatrix)
    : getRightEdgeMin(costMatrix);
  let { x, y } = minCost.current;
  let pos = orientation === 'vertical' ? y : x;
  const seam: Seam = [];
  while (pos > 0) {
    seam.push({ x, y });
    const neighbor = costMatrix[x][y].minNeighbor!;
    ({ x, y } = neighbor);
    pos -= 1;
  }
  seam.push({ x, y });
  return seam;
}

/**
 * Finds the lowest-energy seam in the gradient image.
 * Returns an array of `{x, y}` points tracing the seam from the high-cost edge back to
 * the low-cost edge (bottom→top for `'vertical'`, right→left for `'horizontal'`).
 */
export function findSeam(orientation: Orientation, gradData: ImageData): Seam {
  const costMatrix = computeCostMatrix(gradData, orientation);
  return computeSeam(orientation, costMatrix);
}

/**
 * Removes a seam from the image, returning a new `ImageData` one pixel narrower
 * (`'vertical'`) or shorter (`'horizontal'`).
 */
export function ripSeam(seam: Seam, orientation: Orientation, imgData: ImageData): ImageData {
  const src32 = new Uint32Array(imgData.data.buffer);
  const w = orientation === 'vertical' ? imgData.width - 1 : imgData.width;
  const h = orientation === 'horizontal' ? imgData.height - 1 : imgData.height;
  const tgtBuf = new ArrayBuffer(w * h * 4);
  const tgt32 = new Uint32Array(tgtBuf);
  const tgt8 = new Uint8ClampedArray(tgtBuf);
  const seamIdxs = new Set(seam.map(p => at(p.x, p.y, imgData.width)));
  let tgtX = 0, tgtY = 0;

  if (orientation === 'vertical') {
    for (let y = 0; y < imgData.height; y++, tgtY++) {
      tgtX = 0;
      for (let x = 0; x < imgData.width; x++) {
        const srcIdx = at(x, y, imgData.width);
        if (seamIdxs.has(srcIdx)) continue;
        tgt32[at(tgtX, tgtY, w)] = src32[srcIdx];
        tgtX++;
      }
    }
  } else {
    tgtX = 0;
    for (let x = 0; x < imgData.width; x++, tgtX++) {
      tgtY = 0;
      for (let y = 0; y < imgData.height; y++) {
        const srcIdx = at(x, y, imgData.width);
        if (seamIdxs.has(srcIdx)) continue;
        tgt32[at(tgtX, tgtY, w)] = src32[srcIdx];
        tgtY++;
      }
    }
  }
  return new ImageData(tgt8, w, h);
}

/**
 * Seam-carves `imageData` down to `width` × `height` using the specified gradient `derivative`.
 * Silently no-ops for any dimension already at or below the target (enlargement is not supported).
 * The gradient is computed once upfront and seam-ripped in parallel with the image each iteration.
 */
export function resize(
  imageData: ImageData,
  derivative: Derivative,
  width: number,
  height: number
): ImageData {
  let currentWidth = imageData.width;
  let currentHeight = imageData.height;
  // Gradient is computed once and then seam-ripped alongside imageData each iteration.
  // This avoids recomputing the gradient per step (a deliberate performance tradeoff that
  // matches the original carver2.js implementation exactly).
  let gradImg = derivative === 'simple' ? simpleGradient(imageData) : sobelGradient(imageData);

  while (currentWidth > width) {
    const seam = findSeam('vertical', gradImg);
    imageData = ripSeam(seam, 'vertical', imageData);
    gradImg = ripSeam(seam, 'vertical', gradImg);
    currentWidth -= 1;
  }

  while (currentHeight > height) {
    const seam = findSeam('horizontal', gradImg);
    imageData = ripSeam(seam, 'horizontal', imageData);
    gradImg = ripSeam(seam, 'horizontal', gradImg);
    currentHeight -= 1;
  }

  return imageData;
}
