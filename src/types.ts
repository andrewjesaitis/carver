export type Orientation = 'vertical' | 'horizontal';
export type Derivative = 'simple' | 'sobel';
export type Engine = 'ts' | 'wasm';

export interface SeamPoint {
  x: number;
  y: number;
}
export type Seam = SeamPoint[];

export interface CostCell {
  current: { x: number; y: number; cost: number };
  minNeighbor: (SeamPoint & { cost: number }) | null;
}
export type CostMatrix = CostCell[][];

// Worker message types
export interface ResizeRequest {
  type: 'RESIZE';
  buffer: ArrayBuffer;
  width: number;
  height: number;
  derivative: Derivative;
  targetWidth: number;
  targetHeight: number;
  engine: Engine;
}

export interface ResizeResponse {
  type: 'RESIZE';
  buffer: ArrayBuffer;
  width: number;
  height: number;
  elapsed: number;
}

export interface ResizeError {
  type: 'RESIZE_ERROR';
  message: string;
}

export interface WasmStatus {
  type: 'WASM_STATUS';
  available: boolean;
}

export interface EngineRunState {
  status: 'idle' | 'running' | 'done' | 'error' | 'unavailable';
  elapsedMs: number | null;
  tickerMs: number | null;
  errorMessage: string | null;
}

export interface EngineRuns {
  wasm: EngineRunState;
  ts: EngineRunState;
}

export type VisualizerStage = 'image' | 'greyscale' | 'energy' | 'cost' | 'seam';

// Playback speed multipliers offered by the visualizer controls.
export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export interface KernelSample {
  pixels: number[]; // 3×3 luminance values, row-major, centered on seam midpoint
  gx: number;
  gy: number;
  magnitude: number;
  centerX: number;
  centerY: number;
}

export type CostDir = 'left' | 'up' | 'right';

export interface CostDetailSample {
  costs: number[]; // row-major grid of cumulative costs, size = gridWidth × gridHeight
  arrowDirs: CostDir[]; // parent-pointer direction per cell
  gridWidth: number;
  gridHeight: number;
  minIndex: number; // index of the minimum cell within this grid
  orientation: Orientation; // which way this seam's cost was accumulated
}

// Worker-internal snapshot — never posted directly; use VisualizeFrameMsg for transfer.
export interface VisualizerFrame {
  seam: number; // 0-indexed
  imageData: ImageData;
  greyscaleMap: ImageData;
  energyMap: ImageData;
  costHeatmap: ImageData;
  seamPath: Seam;
  kernelSample: KernelSample;
  costDetail: CostDetailSample;
}

// Worker messages
export interface VisualizeInit {
  type: 'VISUALIZE_INIT';
  buffer: ArrayBuffer;
  width: number;
  height: number;
  derivative: Derivative;
  targetWidth: number;
  targetHeight: number;
}

export interface VisualizeSeek {
  type: 'VISUALIZE_SEEK';
  seam: number;
}

export interface VisualizeReady {
  type: 'VISUALIZE_READY';
  totalSeams: number;
}

export interface VisualizeError {
  type: 'VISUALIZE_ERROR';
  message: string;
}

// Transfers ArrayBuffers (not ImageData) to match the existing ResizeResponse pattern.
export interface VisualizeFrameMsg {
  type: 'VISUALIZE_FRAME';
  seam: number;
  imageBuffer: ArrayBuffer;
  greyscaleBuffer: ArrayBuffer;
  energyBuffer: ArrayBuffer;
  costBuffer: ArrayBuffer;
  width: number;
  height: number;
  seamPath: Seam;
  kernelSample: KernelSample;
  costDetail: CostDetailSample;
}
