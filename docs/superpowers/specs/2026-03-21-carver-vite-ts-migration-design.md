# Carver Phase 1: Vite + TypeScript Migration

**Date:** 2026-03-21
**Status:** Approved

## Goal

Migrate Carver from a Webpack 3 / Babel 6 / React 16 / Redux stack to a modern Vite + React + TypeScript project. Deliver a working image upload → seam carve → download flow as the baseline before introducing a Rust/WASM implementation in a later phase.

## Scope

Phase 1 only. Out of scope: Rust/WASM implementation, image enlargement, gradient visualization, seam overlay display, `CALCULATE_DISPLAY_IMAGE` worker message.

---

## 1. Project Structure

The existing repo root becomes the new project. All legacy config and `app/` contents are removed.

**Removed:**

- `webpack.config.js`, `.babelrc`, `.bowerrc`, `.jscsrc`, `.jshintrc`, `.yo-rc.json`, `.eslintrc`
- `app/` directory (all contents)
- `jestSetup.js`, `package.json`

**New layout:**

```text
carver/
├── src/
│   ├── algorithm/
│   │   ├── carver.ts          # TypeScript port of carver2.js
│   │   └── carver.test.ts     # Vitest unit tests
│   ├── worker/
│   │   └── carver.worker.ts   # typed web worker
│   ├── components/
│   │   ├── App.tsx
│   │   ├── Controls.tsx
│   │   └── Canvas.tsx
│   ├── types.ts               # shared types
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

**Key packages (`package.json` devDependencies):**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^24.0.0",
    "@vitest/globals": "^1.0.0"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

**`vite.config.ts`:**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

**`tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"]
}
```

`lib` uses `"DOM"` only. The worker file adds `/// <reference lib="webworker" />` at the top to get `postMessage` and worker-scoped types without conflicting with DOM globals. This avoids the `DOM` + `WebWorker` lib conflict in strict mode.

---

## 2. Algorithm Port

`src/algorithm/carver.ts` is a direct TypeScript port of the existing `app/scripts/carver2.js`. Logic is unchanged.

**One deliberate rename:** the historical misspelling `gradiant` is corrected to `gradient` throughout (function names and internal references). This is the only deviation from the original source.

**Shared types** (in `src/types.ts`, imported by both the algorithm and the worker):

```ts
export type Orientation = 'vertical' | 'horizontal';
export type Derivative = 'simple' | 'sobel';

export interface SeamPoint { x: number; y: number; }
export type Seam = SeamPoint[];

export interface CostCell {
  current: { x: number; y: number; cost: number };
  minNeighbor: SeamPoint | null;
}
export type CostMatrix = CostCell[][];
```

**Exported API from `carver.ts`:**

```ts
export function greyscale(imgData: ImageData): ImageData
export function simpleGradient(imgData: ImageData): ImageData
export function sobelGradient(imgData: ImageData): ImageData
export function computeCostMatrix(gradData: ImageData, orientation: Orientation): CostMatrix
export function findSeam(orientation: Orientation, gradData: ImageData): Seam
export function ripSeam(seam: Seam, orientation: Orientation, imgData: ImageData): ImageData
export function resize(imageData: ImageData, derivative: Derivative, width: number, height: number): ImageData
```

Note: `computeCostMatrix(gradData, orientation)` and `findSeam(orientation, gradData)` have inconsistent argument ordering — this is preserved from the original source.

**Removed entirely** (not made private — these served display/visualization features that are out of scope for Phase 1):

- `traceSeam` — used only by `calculateDisplayImage` for seam overlay rendering
- `calculateDisplayImage` — the full display pipeline, not needed for carve-only flow

**Made module-private** (not exported — implementation details used only within `carver.ts`):

- `getBottomEdgeMin`, `getRightEdgeMin`, `computeSeam` — previously exported in `carver2.js` but not part of the public API
- `computeCost`, `getMinNeighbor`, `getCost`, `at`, `copyImageData`

Existing tests that target these private/removed helpers should not be ported. Phase 1 tests cover only the exported API.

**Known limitation:** `resize()` silently no-ops for dimensions in the enlargement direction (target width/height larger than source). The while loops simply do not execute. This is acceptable for Phase 1; `Controls.tsx` should disable the Resize button if either target dimension is greater than the corresponding source dimension.

This module is the JS baseline. The future Rust/WASM implementation will expose the same `resize` interface and be toggled against it at runtime.

---

## 3. Worker

`src/worker/carver.worker.ts` exposes a single message type for phase 1.

The file begins with:

```ts
/// <reference lib="webworker" />
```

This provides `postMessage`, `self`, and other worker-scoped globals without requiring `"WebWorker"` in the project-level `tsconfig.json`.

**Typed message protocol** (also declared in `src/types.ts` so `App.tsx` can import them):

```ts
// App.tsx → worker
export interface ResizeRequest {
  type: 'RESIZE';
  buffer: ArrayBuffer;
  width: number;         // source width (needed to reconstruct ImageData)
  height: number;        // source height
  derivative: Derivative;
  targetWidth: number;
  targetHeight: number;
}

// worker → App.tsx
export interface ResizeResponse {
  type: 'RESIZE';
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

// worker → App.tsx (error path)
export interface ResizeError {
  type: 'RESIZE_ERROR';
  message: string;
}
```

The underlying `ArrayBuffer` (`imageData.data.buffer`) is transferred (not copied) using the `postMessage` transferable list on both sides. The main thread reconstructs `ImageData` from `buffer`, `width`, and `height` on receipt.

Error handling: the worker wraps its handler in a try/catch and posts a `ResizeError` on failure. `App.tsx` displays the error message in state and re-enables the Resize button. Errors are not expected in normal use (invalid dimensions are blocked by the UI — see Section 4), but the path must exist.

**Instantiation in `App.tsx`** (path is relative to `src/components/App.tsx`):

```ts
const worker = new Worker(
  new URL('../worker/carver.worker.ts', import.meta.url),
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
  status: 'idle' | 'processing' | 'error';
  errorMessage: string | null;
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;  // default: 'sobel'
}
```

`imageData.width` and `imageData.height` are the source of truth for current image dimensions. When a new image is uploaded, `targetWidth` and `targetHeight` are initialized to `imageData.width` and `imageData.height`. There is no separate `originalWidth`/`originalHeight` in state.

Before sending a `ResizeRequest`, App sets `imageData` to `null` in state (transferring the buffer detaches it, making the in-state `ImageData` invalid). On `ResizeResponse`, App reconstructs `ImageData` from the returned buffer and restores it in state. `Canvas.tsx` renders nothing while `imageData` is null during processing.

Sends `ResizeRequest` to the worker (transferring the buffer), receives `ResizeResponse` or `ResizeError`, reconstructs `ImageData`, and updates state.

### `Controls.tsx`

```ts
interface ControlsProps {
  imageData: ImageData | null;
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  status: AppState['status'];
  onUpload: (imageData: ImageData) => void;
  onTargetWidthChange: (w: number) => void;
  onTargetHeightChange: (h: number) => void;
  onDerivativeChange: (d: Derivative) => void;
  onResize: () => void;
  onDownload: () => void;
}
```

`App.tsx` is responsible for reading the uploaded `File`, drawing it to an offscreen canvas, and calling `getImageData` to produce the `ImageData` passed to `onUpload`. `Controls.tsx` only handles the file input `change` event and passes the `File` up — or, more simply, `App.tsx` attaches the `onChange` handler directly.

The Resize button is disabled when:

- `status === 'processing'`
- `imageData === null`
- `targetWidth > imageData.width` OR `targetHeight > imageData.height` (enlargement not supported)
- `targetWidth === imageData.width` AND `targetHeight === imageData.height` (nothing to carve)

Elements:

- File input (accepts `image/*`)
- Number inputs for target width and height
- Select for derivative (`simple` / `sobel`), default `sobel`
- Resize button
- Download button (disabled when `imageData === null`)

### `Canvas.tsx`

```ts
interface CanvasProps {
  imageData: ImageData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}
```

Renders `imageData` to a `<canvas>` via `ctx.putImageData`. Updates whenever `imageData` changes. `App.tsx` holds the `canvasRef` (created with `useRef`) and passes it down; the download handler in `App.tsx` calls `canvasRef.current.toDataURL()` to export the PNG.

### User Flow

1. Upload image → App reads file → draws to offscreen canvas → calls `getImageData` → sets `imageData` in state; target inputs populated from `imageData.width`/`imageData.height`
2. Edit target width/height, optionally change derivative → Resize button becomes active
3. Click Resize → App transfers buffer to worker, sets `status: 'processing'`
4. Worker posts `ResizeResponse` → App reconstructs `ImageData`, updates state, sets `status: 'idle'`
5. Click Download → canvas exported as PNG via `toDataURL`

**Styling:** Plain CSS. Minimal layout — controls stacked above canvas. No Bootstrap.

---

## 5. CLAUDE.md

```markdown
# Carver

Seam carving (content-aware image resizing) web app.

- **Phase 1 (current):** Vite + React + TypeScript baseline
- **Phase 2 (planned):** Rust/WASM seam carving pipeline, toggled against the TS version at runtime

## Stack
- Vite, React, TypeScript (strict)
- Vitest for tests (co-located with source: `src/algorithm/carver.test.ts`)
- Web Worker for all image compute (no main-thread blocking)

## Conventions
- Algorithm lives in `src/algorithm/carver.ts` — pure functions, no DOM deps
- Shared types in `src/types.ts`
- In production, the worker is the only consumer of the algorithm module (tests also import it directly)
- Components own no compute logic; all image processing goes through the worker
- Plain React hooks for state; no state management library
- Worker uses `/// <reference lib="webworker" />` instead of adding WebWorker to tsconfig lib
```

---

## 6. Testing

- Unit tests in `src/algorithm/carver.test.ts` (co-located with the module), run with `vitest`
- Test naming convention: `carver.test.ts` (Vitest default glob `**/*.{test,spec}.{ts,tsx}` picks this up automatically)
- Tests use synthetic `ImageData` constructed via `jsdom` (configured in `vite.config.ts` test environment)
- Small fixtures (e.g. 3×3 or 4×4 pixels) to verify: greyscale, gradient computation, cost matrix, seam finding, seam removal
- `findSeam` end-to-end tests replace the former split tests for `computeSeam`, `getBottomEdgeMin`, and `getRightEdgeMin` (those are now private); use the same pixel fixtures from the existing test suite to verify correctness
- The worker is not unit-tested directly — Vitest's `jsdom` environment does not support `Worker`, and no worker mocking is needed for Phase 1
- No component tests in phase 1
