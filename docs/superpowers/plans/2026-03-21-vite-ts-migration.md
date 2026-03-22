# Carver Phase 1: Vite + TypeScript Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Webpack 3 / Babel 6 / React 16 / Redux stack with Vite + React 18 + TypeScript, port the seam carving algorithm to TypeScript, and deliver a working image upload → carve → download flow.

**Architecture:** The algorithm lives in `src/algorithm/carver.ts` as pure functions with no DOM dependencies. A web worker (`src/worker/carver.worker.ts`) is the sole production consumer of the algorithm; the UI (`App.tsx`, `Controls.tsx`, `Canvas.tsx`) communicates exclusively through the worker via typed message-passing. The `ArrayBuffer` underlying `ImageData` is transferred (not copied) across the worker boundary.

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Vitest 1, jsdom

**Spec:** `docs/superpowers/specs/2026-03-21-carver-vite-ts-migration-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Create | Shared types: `Orientation`, `Derivative`, `Seam`, `CostMatrix`, worker message interfaces |
| `src/algorithm/carver.ts` | Create | Pure seam carving functions (port of `app/scripts/carver2.js`) |
| `src/algorithm/carver.test.ts` | Create | Vitest unit tests for all exported algorithm functions |
| `src/worker/carver.worker.ts` | Create | Typed web worker: receives `ResizeRequest`, posts `ResizeResponse`/`ResizeError` |
| `src/components/Canvas.tsx` | Create | Renders `ImageData` to `<canvas>` via `putImageData`; exposes ref for download |
| `src/components/Controls.tsx` | Create | File upload, dimension inputs, derivative select, resize/download buttons |
| `src/components/App.tsx` | Create | All state, worker lifecycle, upload-to-ImageData conversion, download handler |
| `src/main.tsx` | Create | React root mount |
| `src/vite-env.d.ts` | Create | Vite client type reference |
| `index.html` | Create | HTML entry point for Vite |
| `vite.config.ts` | Create | Vite + React plugin + Vitest jsdom config |
| `tsconfig.json` | Create | Strict TypeScript, DOM lib, bundler module resolution |
| `package.json` | Replace | New dependencies: vite, react 18, typescript, vitest |
| `CLAUDE.md` | Create | Repo conventions and phase roadmap |

**Files deleted (legacy):** `webpack.config.js`, `.babelrc`, `.bowerrc`, `.eslintrc`, `.jscsrc`, `.jshintrc`, `.yo-rc.json`, `jestSetup.js`, `app/` (entire directory)

---

## Task 1: Remove Legacy Files and Scaffold Vite Project

**Files:**
- Delete: `webpack.config.js`, `.babelrc`, `.bowerrc`, `.eslintrc`, `.jscsrc`, `.jshintrc`, `.yo-rc.json`, `jestSetup.js`, `app/`
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: Delete legacy files**

```bash
rm -rf app webpack.config.js .babelrc .bowerrc .eslintrc .jscsrc .jshintrc .yo-rc.json jestSetup.js package.json
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "carver",
  "version": "1.0.0",
  "description": "Seam carving web app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "@vitest/globals": "^1.0.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "author": "Andrew Jesaitis",
  "license": "MIT"
}
```

- [ ] **Step 3: Create `vite.config.ts`**

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

- [ ] **Step 4: Create `tsconfig.json`**

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

- [ ] **Step 5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Carver</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create minimal `src/main.tsx`** (placeholder until App is built)

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <div>Carver loading…</div>
  </React.StrictMode>
);
```

- [ ] **Step 8: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, no TypeScript errors, browser shows "Carver loading…"

Stop the server with `Ctrl+C`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src/main.tsx src/vite-env.d.ts
git commit -m "feat: scaffold Vite + React + TypeScript project"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Verify TypeScript accepts the types**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Algorithm — Greyscale and Gradient Functions (TDD)

**Files:**
- Create: `src/algorithm/carver.test.ts`
- Create: `src/algorithm/carver.ts`

The 4×4 test fixture below is taken directly from the existing test suite and produces known-correct expected values.

```ts
// shared fixture used across all tests
const testImgArr = new Uint8ClampedArray([
  238, 226, 86, 255,  255, 252, 96, 255,  255, 255, 109, 255,  255, 255, 117, 255,
   84,  83, 58, 255,  131, 131, 80, 255,  151, 150,  76, 255,  196, 193,  68, 255,
   73,  75, 77, 255,   68,  69, 76, 255,   41,  43,  55, 255,   30,  25,  17, 255,
   28,  28, 26, 255,   28,  29, 25, 255,    0,   0,  17, 255,  159, 138,  26, 255,
]);
const testImgData = new ImageData(testImgArr, 4, 4);
```

- [ ] **Step 1: Create `src/algorithm/carver.test.ts` with failing tests for greyscale and gradient functions**

```ts
import { describe, test, expect, beforeEach } from 'vitest';
import { greyscale, simpleGradient, sobelGradient } from './carver';

const testImgArr = new Uint8ClampedArray([
  238, 226,  86, 255,  255, 252,  96, 255,  255, 255, 109, 255,  255, 255, 117, 255,
   84,  83,  58, 255,  131, 131,  80, 255,  151, 150,  76, 255,  196, 193,  68, 255,
   73,  75,  77, 255,   68,  69,  76, 255,   41,  43,  55, 255,   30,  25,  17, 255,
   28,  28,  26, 255,   28,  29,  25, 255,    0,   0,  17, 255,  159, 138,  26, 255,
]);
const testImgData = new ImageData(testImgArr, 4, 4);

describe('greyscale', () => {
  test('converts RGBA image to greyscale using luminance weights', () => {
    const result = greyscale(testImgData);
    const expected = new ImageData(new Uint8ClampedArray([
      219, 219, 219, 255,  242, 242, 242, 255,  245, 245, 245, 255,  245, 245, 245, 255,
       81,  81,  81, 255,  127, 127, 127, 255,  145, 145, 145, 255,  185, 185, 185, 255,
       75,  75,  75, 255,   69,  69,  69, 255,   43,  43,  43, 255,   25,  25,  25, 255,
       28,  28,  28, 255,   29,  29,  29, 255,    1,   1,   1, 255,  135, 135, 135, 255,
    ]), 4, 4);
    expect(result).toEqual(expected);
  });
});

describe('simpleGradient', () => {
  test('computes simple forward-difference gradient magnitude', () => {
    const result = simpleGradient(testImgData);
    const expected = new ImageData(new Uint8ClampedArray([
        0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,
        0,   0,   0, 255,  123, 123, 123, 255,  101, 101, 101, 255,   72,  72,  72, 255,
        0,   0,   0, 255,   58,  58,  58, 255,  105, 105, 105, 255,  161, 161, 161, 255,
        0,   0,   0, 255,   40,  40,  40, 255,   50,  50,  50, 255,  173, 173, 173, 255,
    ]), 4, 4);
    expect(result).toEqual(expected);
  });
});

describe('sobelGradient', () => {
  test('computes Sobel gradient magnitude', () => {
    const result = sobelGradient(testImgData);
    const expected = new ImageData(new Uint8ClampedArray([
        0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,
        0,   0,   0, 255,  190, 190, 190, 255,   32,  32,  32, 255,  252, 252, 252, 255,
       35,  35,  35, 255,  137, 137, 137, 255,  186, 186, 186, 255,    0,   0,   0, 255,
        0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,
    ]), 4, 4);
    expect(result).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- --reporter=verbose src/algorithm/carver.test.ts
```

Expected: 3 failures — `Cannot find module './carver'`

- [ ] **Step 3: Create `src/algorithm/carver.ts` with greyscale and gradient implementations**

```ts
import type { Orientation, Derivative, Seam, CostMatrix, CostCell } from '../types';

function copyImageData(src: ImageData): ImageData {
  const copy = new ImageData(src.width, src.height);
  copy.data.set(src.data);
  return copy;
}

function at(x: number, y: number, arrWidth: number, channels = 1): number {
  return ((y * arrWidth) + x) * channels;
}

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
```

> **Note:** `sobelGradient` accesses out-of-bounds indices at image edges (e.g. `at(-1, -1, w, c)`). `Uint8ClampedArray` returns `0` for out-of-bounds reads, which is the correct border behavior for Sobel — this matches the original `carver2.js` implementation.

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --reporter=verbose src/algorithm/carver.test.ts
```

Expected: 3 passing

- [ ] **Step 5: Commit**

```bash
git add src/algorithm/carver.ts src/algorithm/carver.test.ts
git commit -m "feat: port greyscale and gradient functions to TypeScript (TDD)"
```

---

## Task 4: Algorithm — Cost Matrix, Seam Finding, Seam Removal (TDD)

**Files:**
- Modify: `src/algorithm/carver.test.ts`
- Modify: `src/algorithm/carver.ts`

- [ ] **Step 1: Add failing tests for `computeCostMatrix`, `findSeam`, and `ripSeam` to `src/algorithm/carver.test.ts`**

Update the existing import at the top of the file — replace it with:

```ts
import { greyscale, simpleGradient, sobelGradient, computeCostMatrix, findSeam, ripSeam } from './carver';
import type { CostMatrix, Seam } from '../types';
```

Then append the following test blocks to the end of the file:

```ts
// Sobel gradient of the 4×4 fixture — used as input for cost matrix tests
const sobelGradImg = new ImageData(new Uint8ClampedArray([
    0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,
    0,   0,   0, 255,  190, 190, 190, 255,   32,  32,  32, 255,  252, 252, 252, 255,
   35,  35,  35, 255,  137, 137, 137, 255,  186, 186, 186, 255,    0,   0,   0, 255,
    0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,    0,   0,   0, 255,
]), 4, 4);

describe('computeCostMatrix', () => {
  test('computes vertical cost matrix using dynamic programming', () => {
    const result = computeCostMatrix(sobelGradImg, 'vertical');
    const expected: CostMatrix = [
      [{ current: { cost: 0, x: 0, y: 0 }, minNeighbor: null }, { current: { cost: 0, x: 0, y: 1 }, minNeighbor: { cost: 0, x: 1, y: 0 } }, { current: { cost: 35, x: 0, y: 2 }, minNeighbor: { cost: 0, x: 0, y: 1 } }, { current: { cost: 35, x: 0, y: 3 }, minNeighbor: { cost: 35, x: 0, y: 2 } }],
      [{ current: { cost: 0, x: 1, y: 0 }, minNeighbor: null }, { current: { cost: 190, x: 1, y: 1 }, minNeighbor: { cost: 0, x: 2, y: 0 } }, { current: { cost: 137, x: 1, y: 2 }, minNeighbor: { cost: 0, x: 0, y: 1 } }, { current: { cost: 35, x: 1, y: 3 }, minNeighbor: { cost: 35, x: 0, y: 2 } }],
      [{ current: { cost: 0, x: 2, y: 0 }, minNeighbor: null }, { current: { cost: 32, x: 2, y: 1 }, minNeighbor: { cost: 0, x: 3, y: 0 } }, { current: { cost: 218, x: 2, y: 2 }, minNeighbor: { cost: 32, x: 2, y: 1 } }, { current: { cost: 32, x: 2, y: 3 }, minNeighbor: { cost: 32, x: 3, y: 2 } }],
      [{ current: { cost: 0, x: 3, y: 0 }, minNeighbor: null }, { current: { cost: 252, x: 3, y: 1 }, minNeighbor: { cost: 0, x: 3, y: 0 } }, { current: { cost: 32, x: 3, y: 2 }, minNeighbor: { cost: 32, x: 2, y: 1 } }, { current: { cost: 32, x: 3, y: 3 }, minNeighbor: { cost: 32, x: 3, y: 2 } }],
    ];
    expect(result).toEqual(expected);
  });

  test('computes horizontal cost matrix using dynamic programming', () => {
    const result = computeCostMatrix(sobelGradImg, 'horizontal');
    const expected: CostMatrix = [
      [{ current: { cost: 0, x: 0, y: 0 }, minNeighbor: null }, { current: { cost: 0, x: 0, y: 1 }, minNeighbor: null }, { current: { cost: 35, x: 0, y: 2 }, minNeighbor: null }, { current: { cost: 0, x: 0, y: 3 }, minNeighbor: null }],
      [{ current: { cost: 0, x: 1, y: 0 }, minNeighbor: { cost: 0, x: 0, y: 1 } }, { current: { cost: 190, x: 1, y: 1 }, minNeighbor: { cost: 0, x: 0, y: 1 } }, { current: { cost: 137, x: 1, y: 2 }, minNeighbor: { cost: 0, x: 0, y: 3 } }, { current: { cost: 0, x: 1, y: 3 }, minNeighbor: { cost: 0, x: 0, y: 3 } }],
      [{ current: { cost: 0, x: 2, y: 0 }, minNeighbor: { cost: 0, x: 1, y: 0 } }, { current: { cost: 32, x: 2, y: 1 }, minNeighbor: { cost: 0, x: 1, y: 0 } }, { current: { cost: 186, x: 2, y: 2 }, minNeighbor: { cost: 0, x: 1, y: 3 } }, { current: { cost: 0, x: 2, y: 3 }, minNeighbor: { cost: 0, x: 1, y: 3 } }],
      [{ current: { cost: 0, x: 3, y: 0 }, minNeighbor: { cost: 0, x: 2, y: 0 } }, { current: { cost: 252, x: 3, y: 1 }, minNeighbor: { cost: 0, x: 2, y: 0 } }, { current: { cost: 0, x: 3, y: 2 }, minNeighbor: { cost: 0, x: 2, y: 3 } }, { current: { cost: 0, x: 3, y: 3 }, minNeighbor: { cost: 0, x: 2, y: 3 } }],
    ];
    expect(result).toEqual(expected);
  });
});

describe('findSeam', () => {
  test('finds lowest-cost vertical seam end-to-end', () => {
    const result = findSeam('vertical', sobelGradImg);
    expect(result).toEqual([
      { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 0 },
    ]);
  });

  test('finds lowest-cost horizontal seam end-to-end', () => {
    const result = findSeam('horizontal', sobelGradImg);
    expect(result).toEqual([
      { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 0, y: 3 },
    ]);
  });
});

describe('ripSeam', () => {
  test('removes a vertical seam producing a 3×4 image', () => {
    const vertSeam: Seam = [{ x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 0 }];
    const result = ripSeam(vertSeam, 'vertical', testImgData);
    const expected = new ImageData(new Uint8ClampedArray([
      238, 226,  86, 255,  255, 252,  96, 255,  255, 255, 109, 255,
       84,  83,  58, 255,  131, 131,  80, 255,  196, 193,  68, 255,
       73,  75,  77, 255,   68,  69,  76, 255,   41,  43,  55, 255,
       28,  28,  26, 255,   28,  29,  25, 255,  159, 138,  26, 255,
    ]), 3, 4);
    expect(result).toEqual(expected);
  });

  test('removes a horizontal seam producing a 4×3 image', () => {
    const horzSeam: Seam = [{ x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const result = ripSeam(horzSeam, 'horizontal', testImgData);
    const expected = new ImageData(new Uint8ClampedArray([
      238, 226,  86, 255,
      131, 131,  80, 255,  151, 150,  76, 255,  196, 193,  68, 255,
       73,  75,  77, 255,   68,  69,  76, 255,   41,  43,  55, 255,   30,  25,  17, 255,
       28,  28,  26, 255,   28,  29,  25, 255,    0,   0,  17, 255,  159, 138,  26, 255,
    ]), 4, 3);
    expect(result).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test -- --reporter=verbose src/algorithm/carver.test.ts
```

Expected: 3 passing (gradient tests), 6 failing (new tests — functions not defined)

- [ ] **Step 3: Add `computeCostMatrix`, `findSeam`, `ripSeam`, and `resize` to `src/algorithm/carver.ts`**

Append to the existing `carver.ts`:

```ts
function getCost(x: number, y: number, costMatrix: CostMatrix): SeamPoint & { cost: number } {
  return { x, y, cost: costMatrix[x][y].current.cost };
}

function getMinNeighbor(
  x: number, y: number, orientation: Orientation, costMatrix: CostMatrix
): (SeamPoint & { cost: number }) | null {
  let n1, n2, n3;
  if (orientation === 'vertical') {
    if (y === 0) return null;
    if (x === 0) {
      n1 = getCost(x, y - 1, costMatrix);
      n2 = getCost(x + 1, y - 1, costMatrix);
      return n1.cost <= n2.cost ? n1 : n2;
    }
    if (x === costMatrix.length - 1) {
      n1 = getCost(x - 1, y - 1, costMatrix);
      n2 = getCost(x, y - 1, costMatrix);
      return n1.cost <= n2.cost ? n1 : n2;
    }
    n1 = getCost(x - 1, y - 1, costMatrix);
    n2 = getCost(x, y - 1, costMatrix);
    n3 = getCost(x + 1, y - 1, costMatrix);
    const min12 = n1.cost <= n2.cost ? n1 : n2;
    return min12.cost <= n3.cost ? min12 : n3;
  } else {
    if (x === 0) return null;
    if (y === 0) {
      n1 = getCost(x - 1, y, costMatrix);
      n2 = getCost(x - 1, y + 1, costMatrix);
      return n1.cost <= n2.cost ? n1 : n2;
    }
    if (y === costMatrix[0].length - 1) {
      n1 = getCost(x - 1, y - 1, costMatrix);
      n2 = getCost(x - 1, y, costMatrix);
      return n1.cost <= n2.cost ? n1 : n2;
    }
    n1 = getCost(x - 1, y - 1, costMatrix);
    n2 = getCost(x - 1, y, costMatrix);
    n3 = getCost(x - 1, y + 1, costMatrix);
    const min12 = n1.cost <= n2.cost ? n1 : n2;
    return min12.cost <= n3.cost ? min12 : n3;
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
    .reduce((a, b) => (a.current.cost <= b.current.cost ? a : b));
}

function getRightEdgeMin(costMatrix: CostMatrix): CostCell {
  const lastColIdx = costMatrix.length - 1;
  return costMatrix[lastColIdx]
    .reduce((a, b) => (a.current.cost <= b.current.cost ? a : b));
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

export function findSeam(orientation: Orientation, gradData: ImageData): Seam {
  const costMatrix = computeCostMatrix(gradData, orientation);
  return computeSeam(orientation, costMatrix);
}

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
```

- [ ] **Step 4: Run all tests — verify all pass**

```bash
npm test -- --reporter=verbose src/algorithm/carver.test.ts
```

Expected: 9 passing

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/algorithm/carver.ts src/algorithm/carver.test.ts
git commit -m "feat: port cost matrix, seam finding, and seam removal to TypeScript (TDD)"
```

---

## Task 5: Web Worker

**Files:**
- Create: `src/worker/carver.worker.ts`

- [ ] **Step 1: Create `src/worker/carver.worker.ts`**

```ts
/// <reference lib="webworker" />

import type { ResizeRequest, ResizeResponse, ResizeError } from '../types';
import { resize } from '../algorithm/carver';

self.onmessage = (event: MessageEvent<ResizeRequest>) => {
  try {
    const { buffer, width, height, derivative, targetWidth, targetHeight } = event.data;
    const srcImageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const result = resize(srcImageData, derivative, targetWidth, targetHeight);

    const response: ResizeResponse = {
      type: 'RESIZE',
      buffer: result.data.buffer,
      width: result.width,
      height: result.height,
    };
    (self as unknown as Worker).postMessage(response, [response.buffer]);
  } catch (err) {
    const error: ResizeError = {
      type: 'RESIZE_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/worker/carver.worker.ts
git commit -m "feat: add typed web worker for seam carving"
```

---

## Task 6: Canvas Component

**Files:**
- Create: `src/components/Canvas.tsx`

- [ ] **Step 1: Create `src/components/Canvas.tsx`**

```tsx
import React, { useEffect } from 'react';

interface CanvasProps {
  imageData: ImageData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export default function Canvas({ imageData, canvasRef }: CanvasProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData, canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: imageData ? 'block' : 'none', maxWidth: '100%' }}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas.tsx
git commit -m "feat: add Canvas component"
```

---

## Task 7: Controls Component

**Files:**
- Create: `src/components/Controls.tsx`

- [ ] **Step 1: Create `src/components/Controls.tsx`**

```tsx
import React from 'react';
import type { Derivative } from '../types';

interface ControlsProps {
  imageData: ImageData | null;
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  status: 'idle' | 'processing' | 'error';
  onUpload: (file: File) => void;
  onTargetWidthChange: (w: number) => void;
  onTargetHeightChange: (h: number) => void;
  onDerivativeChange: (d: Derivative) => void;
  onResize: () => void;
  onDownload: () => void;
}

function isResizeDisabled(
  status: ControlsProps['status'],
  imageData: ImageData | null,
  targetWidth: number,
  targetHeight: number,
): boolean {
  if (status === 'processing') return true;
  if (!imageData) return true;
  if (targetWidth > imageData.width || targetHeight > imageData.height) return true;
  if (targetWidth === imageData.width && targetHeight === imageData.height) return true;
  return false;
}

export default function Controls({
  imageData, targetWidth, targetHeight, derivative, status,
  onUpload, onTargetWidthChange, onTargetHeightChange, onDerivativeChange,
  onResize, onDownload,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="control-group">
        <label>
          Image
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </label>
      </div>

      <div className="control-group">
        <label>
          Width
          <input
            type="number"
            value={targetWidth}
            min={1}
            max={imageData?.width ?? undefined}
            onChange={e => onTargetWidthChange(Number(e.target.value))}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            value={targetHeight}
            min={1}
            max={imageData?.height ?? undefined}
            onChange={e => onTargetHeightChange(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="control-group">
        <label>
          Gradient
          <select
            value={derivative}
            onChange={e => onDerivativeChange(e.target.value as Derivative)}
          >
            <option value="sobel">Sobel</option>
            <option value="simple">Simple</option>
          </select>
        </label>
      </div>

      <div className="control-group">
        <button
          onClick={onResize}
          disabled={isResizeDisabled(status, imageData, targetWidth, targetHeight)}
        >
          {status === 'processing' ? 'Carving…' : 'Carve'}
        </button>
        <button
          onClick={onDownload}
          disabled={!imageData}
        >
          Download
        </button>
      </div>

      {status === 'error' && (
        <p className="error">Something went wrong. Try a different image or dimensions.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Controls.tsx
git commit -m "feat: add Controls component"
```

---

## Task 8: App Component and Main Entry

**Files:**
- Create: `src/components/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/components/App.tsx`**

```tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Derivative, ResizeResponse, ResizeError } from '../types';
import Canvas from './Canvas';
import Controls from './Controls';

interface AppState {
  imageData: ImageData | null;
  status: 'idle' | 'processing' | 'error';
  errorMessage: string | null;
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
}

function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No 2d context')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const [state, setState] = useState<AppState>({
    imageData: null,
    status: 'idle',
    errorMessage: null,
    targetWidth: 0,
    targetHeight: 0,
    derivative: 'sobel',
  });

  useEffect(() => {
    const worker = new Worker(
      new URL('../worker/carver.worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (event: MessageEvent<ResizeResponse | ResizeError>) => {
      const msg = event.data;
      if (msg.type === 'RESIZE') {
        const imageData = new ImageData(
          new Uint8ClampedArray(msg.buffer), msg.width, msg.height
        );
        setState(prev => ({ ...prev, imageData, status: 'idle' }));
      } else {
        setState(prev => ({ ...prev, imageData: null, status: 'error', errorMessage: msg.message }));
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    const imageData = await fileToImageData(file);
    setState(prev => ({
      ...prev,
      imageData,
      status: 'idle',
      errorMessage: null,
      targetWidth: imageData.width,
      targetHeight: imageData.height,
    }));
  }, []);

  const handleResize = useCallback(() => {
    const { imageData, derivative, targetWidth, targetHeight } = state;
    if (!imageData || !workerRef.current) return;
    const buffer = imageData.data.buffer;
    setState(prev => ({ ...prev, imageData: null, status: 'processing' }));
    workerRef.current.postMessage(
      { type: 'RESIZE', buffer, width: imageData.width, height: imageData.height, derivative, targetWidth, targetHeight },
      [buffer]
    );
  }, [state]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'carved.png';
    a.click();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Carver</h1>
      </header>
      <Controls
        imageData={state.imageData}
        targetWidth={state.targetWidth}
        targetHeight={state.targetHeight}
        derivative={state.derivative}
        status={state.status}
        onUpload={handleUpload}
        onTargetWidthChange={w => setState(prev => ({ ...prev, targetWidth: w }))}
        onTargetHeightChange={h => setState(prev => ({ ...prev, targetHeight: h }))}
        onDerivativeChange={d => setState(prev => ({ ...prev, derivative: d }))}
        onResize={handleResize}
        onDownload={handleDownload}
      />
      <Canvas imageData={state.imageData} canvasRef={canvasRef} />
    </div>
  );
}
```

- [ ] **Step 2: Update `src/main.tsx` to mount App**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Add minimal styles — create `src/app.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  background: #f5f5f5;
  color: #222;
}

.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.app-header {
  margin-bottom: 1.5rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
}

.control-group {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  font-weight: 500;
}

input[type="number"],
select {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100px;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #222;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
}

button:disabled {
  background: #aaa;
  cursor: default;
}

.error {
  color: #c00;
  font-size: 0.85rem;
  width: 100%;
}

canvas {
  border: 1px solid #ddd;
  border-radius: 4px;
}
```

- [ ] **Step 4: Import styles in `src/main.tsx`**

Add `import './app.css';` as the first line of `src/main.tsx`.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run the dev server and smoke test manually**

```bash
npm run dev
```

Open the browser URL shown. Upload an image, reduce width/height, click Carve, verify the canvas updates, click Download, verify PNG saves. Stop server with `Ctrl+C`.

- [ ] **Step 7: Commit**

```bash
git add src/components/App.tsx src/main.tsx src/app.css
git commit -m "feat: add App component and wire up full upload → carve → download flow"
```

---

## Task 9: CLAUDE.md and Final Checks

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# Carver

Seam carving (content-aware image resizing) web app.

- **Phase 1 (current):** Vite + React + TypeScript baseline
- **Phase 2 (planned):** Rust/WASM seam carving pipeline, toggled against the TS version at runtime
- **Phase 3 (planned):** Visualizer — step-through mode, canvas overlay visualizations, playback controls (play/pause/speed/step)
- **Phase 4 (planned):** Polish — responsive UI, drag-and-drop upload, before/after slider comparison; maybe vertical seam carving and content amplification

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

- [ ] **Step 2: Run all tests one final time**

```bash
npm test
```

Expected: 9 passing, 0 failing.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: `dist/` created, no TypeScript or build errors.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: add CLAUDE.md; Phase 1 complete"
```

---

## Done

Phase 1 is complete when:
- [ ] `npm test` — 9 passing
- [ ] `npm run build` — no errors
- [ ] Upload → Carve → Download works end-to-end in the browser
- [ ] `CLAUDE.md` committed at repo root
