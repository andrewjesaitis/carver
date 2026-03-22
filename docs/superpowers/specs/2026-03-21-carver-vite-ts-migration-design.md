# Carver Phase 1: Vite + TypeScript Migration

**Date:** 2026-03-21
**Status:** Approved

## Goal

Migrate Carver from a Webpack 3 / Babel 6 / React 16 / Redux stack to a modern Vite + React + TypeScript project. Deliver a working image upload → seam carve → download flow as the baseline before introducing a Rust/WASM implementation in a later phase.

## Scope

Phase 1 only. Out of scope: Rust/WASM implementation, image enlargement, gradient visualization, seam overlay display.

---

## 1. Project Structure

The existing repo root becomes the new project. All legacy config and `app/` contents are removed.

**Removed:**
- `webpack.config.js`, `.babelrc`, `.bowerrc`, `.jscsrc`, `.jshintrc`, `.yo-rc.json`, `.eslintrc`
- `app/` directory (all contents)
- `jestSetup.js`, `package.json`

**New layout:**
```
carver/
├── src/
│   ├── algorithm/
│   │   └── carver.ts          # TypeScript port of carver2.js
│   ├── worker/
│   │   └── carver.worker.ts   # typed web worker
│   ├── components/
│   │   ├── App.tsx
│   │   ├── Controls.tsx
│   │   └── Canvas.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
│   └── (static assets: favicon, sample images)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── CLAUDE.md
```

**Tooling:**
- `vite` + `@vitejs/plugin-react` — build and dev server
- `typescript` — strict mode enabled
- `vitest` — test runner (replaces Jest, no extra config needed with Vite)
- No Redux, no ImmutableJS, no Babel, no Webpack

---

## 2. Algorithm Port

`src/algorithm/carver.ts` is a direct TypeScript port of the existing `app/scripts/carver2.js`. Logic is unchanged; only types are added.

**Core types:**
```ts
type Orientation = 'vertical' | 'horizontal';
type Derivative = 'simple' | 'sobel';

interface SeamPoint { x: number; y: number; }
type Seam = SeamPoint[];

interface CostCell {
  current: { x: number; y: number; cost: number };
  minNeighbor: SeamPoint | null;
}
type CostMatrix = CostCell[][];
```

**Exported API:**
```ts
export function greyscale(imgData: ImageData): ImageData
export function simpleGradient(imgData: ImageData): ImageData
export function sobelGradient(imgData: ImageData): ImageData
export function computeCostMatrix(gradData: ImageData, orientation: Orientation): CostMatrix
export function findSeam(orientation: Orientation, gradData: ImageData): Seam
export function ripSeam(seam: Seam, orientation: Orientation, imgData: ImageData): ImageData
export function resize(imageData: ImageData, derivative: Derivative, width: number, height: number): ImageData
```

This module is the JS baseline. The future Rust/WASM implementation will expose the same `resize` interface and be toggled against it.

---

## 3. Worker

`src/worker/carver.worker.ts` wraps the algorithm for off-main-thread execution. Same two message types as the existing worker:

- `RESIZE` — calls `resize()`, returns carved `ImageData`
- `CALCULATE_DISPLAY_IMAGE` — calls `calculateDisplayImage()`, returns display `ImageData`

Vite handles worker bundling natively. Instantiated in `App.tsx` as:
```ts
const worker = new Worker(
  new URL('./worker/carver.worker.ts', import.meta.url),
  { type: 'module' }
);
```

No `worker-loader` or `webworker-promise` needed.

---

## 4. UI Components

Plain React with hooks. No state management library.

### `App.tsx`
Owns all application state:
```ts
interface AppState {
  imageData: ImageData | null;
  status: 'idle' | 'processing';
  targetWidth: number;
  targetHeight: number;
}
```
Sends messages to the worker, receives results, updates state, triggers download.

### `Controls.tsx`
Props: current image dimensions, target dimensions, status, callbacks for upload/resize/download.

Elements:
- File input for image upload (accepts `image/*`)
- Number inputs for target width and height
- Resize button (disabled while `status === 'processing'`)
- Download button (disabled when no image loaded)

### `Canvas.tsx`
Props: `imageData: ImageData | null`.
Renders image data to a `<canvas>` via `ctx.putImageData`. Updates on every `imageData` change.

### User Flow
1. Upload image → canvas displays it, dimensions populate the inputs
2. Edit target width/height → click Resize
3. Worker runs, status shows processing, button disabled
4. Result posted back → canvas updates with carved image
5. Click Download → canvas exported as PNG via `toDataURL`

**Styling:** Plain CSS. Minimal layout — controls stacked above canvas. No Bootstrap.

---

## 5. CLAUDE.md

A minimal file capturing the conventions specific to this repo:

```markdown
# Carver

Seam carving web app. Phase 1: Vite + React + TypeScript baseline.
Phase 2 (planned): Rust/WASM implementation of the seam carving pipeline,
toggled against the TypeScript version at runtime.

## Stack
- Vite, React, TypeScript (strict)
- Vitest for tests
- Web Worker for compute (no main-thread blocking)

## Conventions
- Algorithm lives in `src/algorithm/carver.ts` — pure functions, no DOM deps
- Worker is the only consumer of the algorithm module
- Components own no compute logic; all image processing goes through the worker
- Plain React hooks for state; no state management library
```

---

## Testing

- Unit tests for algorithm functions in `src/algorithm/carver.ts` using Vitest
- Tests use synthetic `ImageData` (small fixtures, e.g. 3×3 pixels) to verify gradient, cost, seam, and rip logic
- No component tests in phase 1
