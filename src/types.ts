export type Orientation = 'vertical' | 'horizontal';
export type Derivative = 'simple' | 'sobel';

export interface SeamPoint {
  x: number;
  y: number;
}
export type Seam = SeamPoint[];

export interface CostCell {
  current: { x: number; y: number; cost: number };
  minNeighbor: SeamPoint | null;
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
}

export interface ResizeResponse {
  type: 'RESIZE';
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

export interface ResizeError {
  type: 'RESIZE_ERROR';
  message: string;
}
