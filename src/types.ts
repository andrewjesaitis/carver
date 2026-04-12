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
