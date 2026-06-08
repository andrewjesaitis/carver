import type { Derivative, Seam, VisualizerFrame } from '../types';
import { resizeSteps } from '../algorithm/carver';

export interface VizSeekState {
  gen: Generator<VisualizerFrame>;
  seams: Seam[];
  originalBuffer: ArrayBuffer;
  originalWidth: number;
  originalHeight: number;
  derivative: Derivative;
  targetWidth: number;
  targetHeight: number;
  currentSeam: number;
}

export function computeTotalSeams(
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): number {
  return Math.max(0, width - targetWidth) + Math.max(0, height - targetHeight);
}

export function initViz(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  derivative: Derivative,
  targetWidth: number,
  targetHeight: number,
): VizSeekState {
  const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
  return {
    gen: resizeSteps(imageData, derivative, targetWidth, targetHeight),
    seams: [],
    originalBuffer: new Uint8ClampedArray(buffer).buffer,
    originalWidth: width,
    originalHeight: height,
    derivative,
    targetWidth,
    targetHeight,
    currentSeam: -1,
  };
}

export function seekViz(
  state: VizSeekState,
  n: number,
): { state: VizSeekState; frame: VisualizerFrame } {
  if (n > state.currentSeam) {
    return advanceTo(state, n);
  }
  // Backward seek: restart generator from original and advance to n.
  const fresh = initViz(
    new Uint8ClampedArray(state.originalBuffer).buffer,
    state.originalWidth,
    state.originalHeight,
    state.derivative,
    state.targetWidth,
    state.targetHeight,
  );
  return advanceTo(fresh, n);
}

function advanceTo(
  state: VizSeekState,
  n: number,
): { state: VizSeekState; frame: VisualizerFrame } {
  const seams = [...state.seams];
  let currentSeam = state.currentSeam;
  let frame: VisualizerFrame | undefined;

  while (currentSeam < n) {
    const { value, done } = state.gen.next();
    if (done || !value) break;
    frame = value;
    if (seams.length <= value.seam) seams.push(value.seamPath);
    currentSeam = value.seam;
  }

  if (!frame || currentSeam !== n) throw new Error(`Seam ${n} out of range`);
  return { state: { ...state, seams, currentSeam }, frame };
}
