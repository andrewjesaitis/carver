# Carver Demo UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the developer-oriented UI with a portfolio-grade demo that showcases the WASM-vs-TS speed difference via parallel dual-worker execution, a prose tutorial, and an academic-manuscript aesthetic.

**Architecture:** Two `Worker` instances (one engine-pinned to WASM, one to TS) run in parallel on each Carve click. A pure `useReducer` reducer owns all state transitions and is unit-tested. A main-thread `setInterval` ticker drives live elapsed counters during the slow TS run. Five new leaf components render the redesigned surface; the existing worker/algorithm code is unchanged.

**Tech Stack:** Vite, React 18, TypeScript (strict), Vitest + jsdom, existing Rust/WASM seam-carving worker.

**Spec:** [docs/superpowers/specs/2026-04-13-carver-demo-ui-design.md](../specs/2026-04-13-carver-demo-ui-design.md)

---

## File structure

Files created:

- `public/samples/balloon.jpg`, `public/samples/tower.jpg` — sample images served as static assets (moved from repo root)
- `src/components/Masthead.tsx` — wordmark + tagline
- `src/components/SamplePicker.tsx` — sample dropdown + upload affordance
- `src/components/TimingPanel.tsx` — three cards (WASM / TS / speedup)
- `src/components/CanvasTabs.tsx` — Original/Carved tab header
- `src/components/Explainer.tsx` — static prose, four sub-sections
- `src/components/timing.ts` — `formatMs`, `computeSpeedup` (pure)
- `src/components/timing.test.ts`
- `src/components/reducer.ts` — `UiState`, `Action`, `reducer`, `initialState` (pure)
- `src/components/reducer.test.ts`
- `src/components/image-loading.ts` — `fileToImageData`, `urlToImageData`

Files modified:

- `src/components/App.tsx` — dual worker instantiation, reducer-driven state, ticker, wire new components (near-full rewrite)
- `src/components/Controls.tsx` — remove Engine select + elapsed text + error text, use SamplePicker, update disabled logic
- `src/components/Canvas.tsx` — minor (no behavioural change; parent now passes which ImageData to render)
- `src/app.css` — full rewrite to the new aesthetic
- `index.html` — add Google Fonts link for STIX Two Text, update `<title>`
- `src/types.ts` — add `EngineRunState`, `EngineKey`, `EngineRuns` (shared between reducer and props)

Files unchanged:

- `src/algorithm/*`, `src/worker/*`, `src/wasm/*`, `crates/*`, `index.html`-unchanged (outside the two noted edits)

---

## Task 1: Move sample images into `public/samples/`

**Files:**

- Create: `public/samples/balloon.jpg`, `public/samples/tower.jpg`
- Delete: `balloon.jpg`, `tower.jpg` (repo root)

- [ ] **Step 1: Move the files via `git mv`**

```bash
mkdir -p public/samples
git mv balloon.jpg public/samples/balloon.jpg
git mv tower.jpg public/samples/tower.jpg
```

- [ ] **Step 2: Verify paths and that Vite serves them**

```bash
ls public/samples
```

Expected: `balloon.jpg  tower.jpg`

Run `npm run dev` in a second terminal if convenient, then `curl -I http://localhost:5173/samples/balloon.jpg` → `HTTP/1.1 200 OK`. (If you don't want to spin up dev yet, skip this and verify during Task 16 manual checks.)

- [ ] **Step 3: Commit**

```bash
git add public/samples/balloon.jpg public/samples/tower.jpg
git commit -m "chore: move sample images to public/samples/"
```

---

## Task 2: Update `index.html` (font + title)

**Files:**

- Modify: `index.html`

- [ ] **Step 1: Replace the file with the updated head**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Carver — Seam Carving, WASM vs TypeScript</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:wght@400;500;600;700&display=swap"
    />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: load STIX Two Text and update page title"
```

---

## Task 3: Add new shared types

**Files:**

- Modify: `src/types.ts`

- [ ] **Step 1: Append new types to `src/types.ts`**

Append (do not replace existing exports) to the end of `src/types.ts`:

```ts
export type EngineKey = 'ts' | 'wasm';

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
```

- [ ] **Step 2: Verify the file still type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add EngineKey, EngineRunState, EngineRuns"
```

---

## Task 4: Pure timing utilities + tests

**Files:**

- Create: `src/components/timing.ts`
- Create: `src/components/timing.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `src/components/timing.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
npx vitest run src/components/timing.test.ts
```

Expected: FAIL — `Cannot find module './timing'`.

- [ ] **Step 3: Implement `src/components/timing.ts`**

```ts
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function computeSpeedup(wasmMs: number, tsMs: number): string {
  return `${(tsMs / wasmMs).toFixed(1)}×`;
}
```

- [ ] **Step 4: Re-run the tests**

```bash
npx vitest run src/components/timing.test.ts
```

Expected: PASS (5 passing).

- [ ] **Step 5: Commit**

```bash
git add src/components/timing.ts src/components/timing.test.ts
git commit -m "feat(ui): timing formatters (formatMs, computeSpeedup)"
```

---

## Task 5: Pure reducer + tests

**Files:**

- Create: `src/components/reducer.ts`
- Create: `src/components/reducer.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `src/components/reducer.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { reducer, initialState, type UiState } from './reducer';

function seedImageData(w = 4, h = 4): ImageData {
  return new ImageData(new Uint8ClampedArray(w * h * 4), w, h);
}

const running = {
  status: 'running' as const,
  elapsedMs: null,
  tickerMs: 0,
  errorMessage: null,
};
const idle = {
  status: 'idle' as const,
  elapsedMs: null,
  tickerMs: null,
  errorMessage: null,
};

describe('WASM_STATUS', () => {
  test('marks status known and records availability (true)', () => {
    const next = reducer(initialState, { type: 'WASM_STATUS', available: true });
    expect(next.wasmStatusKnown).toBe(true);
    expect(next.wasmAvailable).toBe(true);
  });

  test('marks status known and records availability (false)', () => {
    const next = reducer(initialState, { type: 'WASM_STATUS', available: false });
    expect(next.wasmStatusKnown).toBe(true);
    expect(next.wasmAvailable).toBe(false);
  });
});

describe('IMAGE_LOADED', () => {
  test('sets image, defaults targets to native size, resets tab and runs', () => {
    const img = seedImageData(800, 600);
    const next = reducer(initialState, {
      type: 'IMAGE_LOADED',
      imageData: img,
      sampleKey: 'balloon',
    });
    expect(next.imageData).toBe(img);
    expect(next.sampleKey).toBe('balloon');
    expect(next.targetWidth).toBe(800);
    expect(next.targetHeight).toBe(600);
    expect(next.activeTab).toBe('original');
    expect(next.carvedImageData).toBeNull();
    expect(next.runs.wasm.status).toBe('idle');
    expect(next.runs.ts.status).toBe('idle');
  });
});

describe('CARVE_STARTED', () => {
  test('both engines running when WASM is available', () => {
    const s: UiState = { ...initialState, wasmAvailable: true, wasmStatusKnown: true };
    const next = reducer(s, { type: 'CARVE_STARTED' });
    expect(next.runs.wasm.status).toBe('running');
    expect(next.runs.ts.status).toBe('running');
    expect(next.activeTab).toBe('carved');
    expect(next.carvedImageData).toBeNull();
  });

  test('only TS runs when WASM is unavailable', () => {
    const s: UiState = { ...initialState, wasmAvailable: false, wasmStatusKnown: true };
    const next = reducer(s, { type: 'CARVE_STARTED' });
    expect(next.runs.wasm.status).toBe('unavailable');
    expect(next.runs.ts.status).toBe('running');
  });
});

describe('TICK', () => {
  test('updates tickerMs for the specified engine when running', () => {
    const s: UiState = { ...initialState, runs: { wasm: running, ts: running } };
    const next = reducer(s, { type: 'TICK', engine: 'wasm', elapsed: 123 });
    expect(next.runs.wasm.tickerMs).toBe(123);
    expect(next.runs.ts.tickerMs).toBe(0);
  });

  test('is a no-op when the engine is not running', () => {
    const s: UiState = {
      ...initialState,
      runs: {
        wasm: { status: 'done', elapsedMs: 42, tickerMs: null, errorMessage: null },
        ts: running,
      },
    };
    const next = reducer(s, { type: 'TICK', engine: 'wasm', elapsed: 500 });
    expect(next).toBe(s);
  });
});

describe('WORKER_RESPONSE', () => {
  test('WASM response moves the engine to done and renders its image', () => {
    const img = seedImageData(3, 3);
    const s: UiState = {
      ...initialState,
      wasmAvailable: true,
      wasmStatusKnown: true,
      runs: { wasm: running, ts: running },
    };
    const next = reducer(s, {
      type: 'WORKER_RESPONSE',
      engine: 'wasm',
      elapsedMs: 42,
      imageData: img,
    });
    expect(next.runs.wasm.status).toBe('done');
    expect(next.runs.wasm.elapsedMs).toBe(42);
    expect(next.carvedImageData).toBe(img);
  });

  test('TS response does NOT overwrite canvas when WASM ran successfully', () => {
    const wasmImg = seedImageData(3, 3);
    const tsImg = seedImageData(3, 3);
    const s: UiState = {
      ...initialState,
      wasmAvailable: true,
      wasmStatusKnown: true,
      carvedImageData: wasmImg,
      runs: {
        wasm: { status: 'done', elapsedMs: 42, tickerMs: null, errorMessage: null },
        ts: running,
      },
    };
    const next = reducer(s, {
      type: 'WORKER_RESPONSE',
      engine: 'ts',
      elapsedMs: 420,
      imageData: tsImg,
    });
    expect(next.carvedImageData).toBe(wasmImg);
    expect(next.runs.ts.elapsedMs).toBe(420);
    expect(next.runs.ts.status).toBe('done');
  });

  test('TS response DOES render when WASM is unavailable', () => {
    const tsImg = seedImageData(3, 3);
    const s: UiState = {
      ...initialState,
      wasmAvailable: false,
      wasmStatusKnown: true,
      carvedImageData: null,
      runs: {
        wasm: { status: 'unavailable', elapsedMs: null, tickerMs: null, errorMessage: null },
        ts: running,
      },
    };
    const next = reducer(s, {
      type: 'WORKER_RESPONSE',
      engine: 'ts',
      elapsedMs: 420,
      imageData: tsImg,
    });
    expect(next.carvedImageData).toBe(tsImg);
  });
});

describe('WORKER_ERROR', () => {
  test('sets the specified engine to error; other engine unchanged', () => {
    const s: UiState = { ...initialState, runs: { wasm: running, ts: running } };
    const next = reducer(s, { type: 'WORKER_ERROR', engine: 'wasm', message: 'boom' });
    expect(next.runs.wasm.status).toBe('error');
    expect(next.runs.wasm.errorMessage).toBe('boom');
    expect(next.runs.ts.status).toBe('running');
  });
});

describe('simple field setters', () => {
  test('TARGET_WIDTH_CHANGED updates only targetWidth', () => {
    const next = reducer(initialState, { type: 'TARGET_WIDTH_CHANGED', value: 400 });
    expect(next.targetWidth).toBe(400);
    expect(next.targetHeight).toBe(initialState.targetHeight);
  });

  test('TAB_CHANGED updates activeTab', () => {
    const next = reducer(initialState, { type: 'TAB_CHANGED', tab: 'carved' });
    expect(next.activeTab).toBe('carved');
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
npx vitest run src/components/reducer.test.ts
```

Expected: FAIL — `Cannot find module './reducer'`.

- [ ] **Step 3: Implement `src/components/reducer.ts`**

```ts
import type { Derivative, EngineKey, EngineRuns, EngineRunState } from '../types';

export type SampleKey = 'balloon' | 'tower' | 'upload';

export interface UiState {
  imageData: ImageData | null;
  carvedImageData: ImageData | null;
  activeTab: 'original' | 'carved';
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  sampleKey: SampleKey;
  wasmStatusKnown: boolean;
  wasmAvailable: boolean;
  runs: EngineRuns;
}

export type Action =
  | { type: 'IMAGE_LOADED'; imageData: ImageData; sampleKey: SampleKey }
  | { type: 'TARGET_WIDTH_CHANGED'; value: number }
  | { type: 'TARGET_HEIGHT_CHANGED'; value: number }
  | { type: 'DERIVATIVE_CHANGED'; value: Derivative }
  | { type: 'TAB_CHANGED'; tab: 'original' | 'carved' }
  | { type: 'CARVE_STARTED' }
  | { type: 'TICK'; engine: EngineKey; elapsed: number }
  | {
      type: 'WORKER_RESPONSE';
      engine: EngineKey;
      elapsedMs: number;
      imageData: ImageData;
    }
  | { type: 'WORKER_ERROR'; engine: EngineKey; message: string }
  | { type: 'WASM_STATUS'; available: boolean };

const idleEngineRun: EngineRunState = {
  status: 'idle',
  elapsedMs: null,
  tickerMs: null,
  errorMessage: null,
};

export const initialState: UiState = {
  imageData: null,
  carvedImageData: null,
  activeTab: 'original',
  targetWidth: 0,
  targetHeight: 0,
  derivative: 'sobel',
  sampleKey: 'balloon',
  wasmStatusKnown: false,
  wasmAvailable: false,
  runs: { wasm: idleEngineRun, ts: idleEngineRun },
};

export function reducer(state: UiState, action: Action): UiState {
  switch (action.type) {
    case 'IMAGE_LOADED':
      return {
        ...state,
        imageData: action.imageData,
        carvedImageData: null,
        sampleKey: action.sampleKey,
        targetWidth: action.imageData.width,
        targetHeight: action.imageData.height,
        activeTab: 'original',
        runs: { wasm: idleEngineRun, ts: idleEngineRun },
      };
    case 'TARGET_WIDTH_CHANGED':
      return { ...state, targetWidth: action.value };
    case 'TARGET_HEIGHT_CHANGED':
      return { ...state, targetHeight: action.value };
    case 'DERIVATIVE_CHANGED':
      return { ...state, derivative: action.value };
    case 'TAB_CHANGED':
      return { ...state, activeTab: action.tab };
    case 'CARVE_STARTED':
      return {
        ...state,
        carvedImageData: null,
        activeTab: 'carved',
        runs: {
          wasm: state.wasmAvailable
            ? { status: 'running', elapsedMs: null, tickerMs: 0, errorMessage: null }
            : { status: 'unavailable', elapsedMs: null, tickerMs: null, errorMessage: null },
          ts: { status: 'running', elapsedMs: null, tickerMs: 0, errorMessage: null },
        },
      };
    case 'TICK':
      if (state.runs[action.engine].status !== 'running') return state;
      return {
        ...state,
        runs: {
          ...state.runs,
          [action.engine]: { ...state.runs[action.engine], tickerMs: action.elapsed },
        },
      };
    case 'WORKER_RESPONSE': {
      const nextRun: EngineRunState = {
        status: 'done',
        elapsedMs: action.elapsedMs,
        tickerMs: null,
        errorMessage: null,
      };
      const useThisResult =
        action.engine === 'wasm' || (action.engine === 'ts' && !state.wasmAvailable);
      return {
        ...state,
        carvedImageData: useThisResult ? action.imageData : state.carvedImageData,
        runs: { ...state.runs, [action.engine]: nextRun },
      };
    }
    case 'WORKER_ERROR':
      return {
        ...state,
        runs: {
          ...state.runs,
          [action.engine]: {
            status: 'error',
            elapsedMs: null,
            tickerMs: null,
            errorMessage: action.message,
          },
        },
      };
    case 'WASM_STATUS':
      return { ...state, wasmStatusKnown: true, wasmAvailable: action.available };
  }
}
```

- [ ] **Step 4: Re-run the tests**

```bash
npx vitest run src/components/reducer.test.ts
```

Expected: PASS (all describes pass).

- [ ] **Step 5: Commit**

```bash
git add src/components/reducer.ts src/components/reducer.test.ts
git commit -m "feat(ui): pure reducer for UI state transitions"
```

---

## Task 6: `image-loading.ts` helpers

**Files:**

- Create: `src/components/image-loading.ts`

No tests: both helpers are thin wrappers around browser APIs (`Image`, `canvas.getContext('2d').getImageData`) that jsdom doesn't fully emulate. Verified manually in Task 16.

- [ ] **Step 1: Implement `src/components/image-loading.ts`**

```ts
/** Loads an image URL into an `ImageData` via an offscreen canvas. */
export function urlToImageData(url: string): Promise<ImageData> {
  return loadFromUrl(url);
}

/** Loads a File (e.g. from an `<input type="file">`) into an `ImageData`. */
export function fileToImageData(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  return loadFromUrl(url).finally(() => URL.revokeObjectURL(url));
}

function loadFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/image-loading.ts
git commit -m "feat(ui): image-loading helpers (url + file)"
```

---

## Task 7: `Masthead` component

**Files:**

- Create: `src/components/Masthead.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';

export default function Masthead() {
  return (
    <header className="masthead">
      <div className="wordmark">carver</div>
      <div className="tagline">seam carving · wasm vs typescript</div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Masthead.tsx
git commit -m "feat(ui): Masthead component"
```

---

## Task 8: `Explainer` component

**Files:**

- Create: `src/components/Explainer.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';

const STEPS: { title: string; body: string }[] = [
  {
    title: 'i. energy map',
    body:
      'Each pixel gets an energy value — roughly, how much it differs from its neighbors. High energy means an edge; low energy means smooth texture. The Sobel gradient makes this explicit.',
  },
  {
    title: 'ii. cost matrix',
    body:
      'A dynamic-programming pass accumulates energy top-to-bottom: each cell stores the cheapest path from the top edge to itself. The bottom row now tells us the cost of every possible seam.',
  },
  {
    title: 'iii. seam',
    body:
      'Starting from the cheapest cell in the bottom row, we walk back up the stored parent pointers. That trace is the lowest-energy seam — the pixels we can remove with the least visible damage.',
  },
  {
    title: 'iv. remove and repeat',
    body:
      "We delete those pixels, shift the image one column narrower, and run the whole thing again. Hundreds of iterations later, we've shed a lot of width without stretching or cropping anything the eye cares about.",
  },
];

export default function Explainer() {
  return (
    <section className="explainer">
      <div className="explainer-label">how seam carving works</div>
      {STEPS.map((step) => (
        <div className="explainer-step" key={step.title}>
          <div className="explainer-step-title">{step.title}</div>
          <div className="explainer-step-body">{step.body}</div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Explainer.tsx
git commit -m "feat(ui): Explainer component with four prose steps"
```

---

## Task 9: `TimingPanel` component

**Files:**

- Create: `src/components/TimingPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';
import type { EngineRuns, EngineRunState } from '../types';
import { computeSpeedup, formatMs } from './timing';

interface Props {
  runs: EngineRuns;
  wasmAvailable: boolean;
}

function renderValue(run: EngineRunState): string {
  if (run.status === 'unavailable') return 'Unavailable';
  if (run.status === 'error') return 'Error';
  if (run.status === 'done' && run.elapsedMs !== null) return formatMs(run.elapsedMs);
  if (run.status === 'running' && run.tickerMs !== null) return formatMs(run.tickerMs);
  return '—';
}

export default function TimingPanel({ runs, wasmAvailable }: Props) {
  const showSpeedup =
    wasmAvailable &&
    runs.wasm.status === 'done' &&
    runs.ts.status === 'done' &&
    runs.wasm.elapsedMs !== null &&
    runs.ts.elapsedMs !== null;

  return (
    <div className="timing-panel">
      <div className="timing-card">
        <div className="timing-label">WASM</div>
        <div className="timing-value">{renderValue(runs.wasm)}</div>
        {runs.wasm.status === 'error' && runs.wasm.errorMessage && (
          <div className="timing-error">{runs.wasm.errorMessage}</div>
        )}
      </div>
      <div className="timing-card">
        <div className="timing-label">TypeScript</div>
        <div className="timing-value">{renderValue(runs.ts)}</div>
        {runs.ts.status === 'error' && runs.ts.errorMessage && (
          <div className="timing-error">{runs.ts.errorMessage}</div>
        )}
      </div>
      {showSpeedup && (
        <div className="timing-card timing-card--speedup">
          <div className="timing-label">Faster</div>
          <div className="timing-value">
            {computeSpeedup(runs.wasm.elapsedMs!, runs.ts.elapsedMs!)}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TimingPanel.tsx
git commit -m "feat(ui): TimingPanel component"
```

---

## Task 10: `CanvasTabs` component

**Files:**

- Create: `src/components/CanvasTabs.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';

interface Size {
  w: number;
  h: number;
}

interface Props {
  activeTab: 'original' | 'carved';
  originalSize: Size | null;
  carvedSize: Size | null;
  onTabChange: (tab: 'original' | 'carved') => void;
}

function formatSize(size: Size | null): string {
  if (!size) return '—';
  return `${size.w}×${size.h}`;
}

export default function CanvasTabs({ activeTab, originalSize, carvedSize, onTabChange }: Props) {
  return (
    <div className="canvas-tabs">
      <button
        type="button"
        className={`canvas-tab ${activeTab === 'original' ? 'canvas-tab--active' : ''}`}
        onClick={() => onTabChange('original')}
        disabled={!originalSize}
      >
        Original · {formatSize(originalSize)}
      </button>
      <button
        type="button"
        className={`canvas-tab ${activeTab === 'carved' ? 'canvas-tab--active' : ''}`}
        onClick={() => onTabChange('carved')}
        disabled={!carvedSize}
      >
        Carved · {formatSize(carvedSize)}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CanvasTabs.tsx
git commit -m "feat(ui): CanvasTabs component"
```

---

## Task 11: `SamplePicker` component

**Files:**

- Create: `src/components/SamplePicker.tsx`

- [ ] **Step 1: Implement**

```tsx
import React, { useRef } from 'react';
import type { SampleKey } from './reducer';

interface Props {
  sampleKey: SampleKey;
  onSample: (key: 'balloon' | 'tower') => void;
  onUpload: (file: File) => void;
}

export default function SamplePicker({ sampleKey, onSample, onUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === 'upload') {
      fileInputRef.current?.click();
      return;
    }
    if (value === 'balloon' || value === 'tower') {
      onSample(value);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }

  return (
    <label className="control control-sample">
      <span className="control-label">Sample</span>
      <select value={sampleKey} onChange={handleSelect}>
        <option value="balloon">Balloon</option>
        <option value="tower">Tower</option>
        <option value="upload">Upload…</option>
      </select>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </label>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SamplePicker.tsx
git commit -m "feat(ui): SamplePicker combining sample dropdown and upload"
```

---

## Task 12: Rewrite `Controls.tsx`

**Files:**

- Modify: `src/components/Controls.tsx` (full rewrite)

- [ ] **Step 1: Replace the file**

```tsx
import React from 'react';
import type { Derivative, EngineRuns } from '../types';
import type { SampleKey } from './reducer';
import SamplePicker from './SamplePicker';

interface Props {
  imageData: ImageData | null;
  sampleKey: SampleKey;
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  wasmStatusKnown: boolean;
  runs: EngineRuns;
  onSample: (key: 'balloon' | 'tower') => void;
  onUpload: (file: File) => void;
  onTargetWidthChange: (w: number) => void;
  onTargetHeightChange: (h: number) => void;
  onDerivativeChange: (d: Derivative) => void;
  onCarve: () => void;
  onDownload: () => void;
}

function isRunning(runs: EngineRuns): boolean {
  return runs.wasm.status === 'running' || runs.ts.status === 'running';
}

function isCarveDisabled(props: Props): boolean {
  const { imageData, targetWidth, targetHeight, wasmStatusKnown, runs } = props;
  if (!wasmStatusKnown) return true;
  if (!imageData) return true;
  if (isRunning(runs)) return true;
  if (targetWidth > imageData.width || targetHeight > imageData.height) return true;
  if (targetWidth === imageData.width && targetHeight === imageData.height) return true;
  return false;
}

export default function Controls(props: Props) {
  const {
    imageData,
    sampleKey,
    targetWidth,
    targetHeight,
    derivative,
    onSample,
    onUpload,
    onTargetWidthChange,
    onTargetHeightChange,
    onDerivativeChange,
    onCarve,
    onDownload,
  } = props;

  return (
    <div className="controls">
      <SamplePicker sampleKey={sampleKey} onSample={onSample} onUpload={onUpload} />

      <label className="control">
        <span className="control-label">Width</span>
        <input
          type="number"
          value={targetWidth}
          min={1}
          max={imageData?.width ?? undefined}
          onChange={(e) => onTargetWidthChange(Number(e.target.value))}
        />
      </label>

      <label className="control">
        <span className="control-label">Height</span>
        <input
          type="number"
          value={targetHeight}
          min={1}
          max={imageData?.height ?? undefined}
          onChange={(e) => onTargetHeightChange(Number(e.target.value))}
        />
      </label>

      <label className="control">
        <span className="control-label">Gradient</span>
        <select
          value={derivative}
          onChange={(e) => onDerivativeChange(e.target.value as Derivative)}
        >
          <option value="sobel">Sobel</option>
          <option value="simple">Simple</option>
        </select>
      </label>

      <button className="btn-primary" onClick={onCarve} disabled={isCarveDisabled(props)}>
        Carve
      </button>

      <button className="btn-secondary" onClick={onDownload} disabled={!imageData}>
        Download
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors will point to `App.tsx` still using old `Controls` props. That's fine — App.tsx is fixed in Task 14. Type-check is expected to pass *after* Task 14.

- [ ] **Step 3: Commit**

```bash
git add src/components/Controls.tsx
git commit -m "refactor(ui): rewrite Controls for new UI (SamplePicker, no engine toggle)"
```

---

## Task 13: Modify `Canvas.tsx`

**Files:**

- Modify: `src/components/Canvas.tsx`

Trivial change: remove the inline `style` that hides the canvas when `imageData` is null; `App` now always passes either original or carved `ImageData`, and the tabs disable themselves when the other side is empty. The canvas is also given a stable class name so CSS can style its container.

- [ ] **Step 1: Replace the file**

```tsx
import React, { useEffect } from 'react';

interface CanvasProps {
  imageData: ImageData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

/** Renders ImageData onto a canvas element. Blank until `imageData` is provided. */
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

  return <canvas ref={canvasRef} className="canvas" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Canvas.tsx
git commit -m "refactor(ui): Canvas always mounts; parent picks which ImageData to render"
```

---

## Task 14: Rewrite `App.tsx`

**Files:**

- Modify: `src/components/App.tsx` (full rewrite)

- [ ] **Step 1: Replace the file**

```tsx
import React, { useEffect, useReducer, useRef, useCallback } from 'react';
import type { ResizeRequest, ResizeResponse, ResizeError, WasmStatus } from '../types';
import Masthead from './Masthead';
import Controls from './Controls';
import CanvasTabs from './CanvasTabs';
import Canvas from './Canvas';
import TimingPanel from './TimingPanel';
import Explainer from './Explainer';
import { reducer, initialState } from './reducer';
import { fileToImageData, urlToImageData } from './image-loading';
import '../app.css';

function cloneBuffer(src: Uint8ClampedArray): ArrayBuffer {
  return new Uint8ClampedArray(src).buffer;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wasmWorkerRef = useRef<Worker | null>(null);
  const tsWorkerRef = useRef<Worker | null>(null);
  const tickerStartRef = useRef<{ wasm: number; ts: number }>({ wasm: 0, ts: 0 });
  const tickerIntervalRef = useRef<number | null>(null);

  const [state, dispatch] = useReducer(reducer, initialState);

  // Instantiate both workers upfront so the first Carve click doesn't pay WASM init cost.
  useEffect(() => {
    const wasmWorker = new Worker(new URL('../worker/carver.worker.ts', import.meta.url), {
      type: 'module',
      name: 'carver-wasm',
    });
    const tsWorker = new Worker(new URL('../worker/carver.worker.ts', import.meta.url), {
      type: 'module',
      name: 'carver-ts',
    });

    wasmWorker.onmessage = (e: MessageEvent<ResizeResponse | ResizeError | WasmStatus>) => {
      const msg = e.data;
      if (msg.type === 'WASM_STATUS') {
        dispatch({ type: 'WASM_STATUS', available: msg.available });
      } else if (msg.type === 'RESIZE') {
        const imageData = new ImageData(
          new Uint8ClampedArray(msg.buffer),
          msg.width,
          msg.height,
        );
        dispatch({ type: 'WORKER_RESPONSE', engine: 'wasm', elapsedMs: msg.elapsed, imageData });
      } else {
        dispatch({ type: 'WORKER_ERROR', engine: 'wasm', message: msg.message });
      }
    };
    tsWorker.onmessage = (e: MessageEvent<ResizeResponse | ResizeError | WasmStatus>) => {
      const msg = e.data;
      // The TS worker also inits WASM on boot; ignore its WASM_STATUS (we source that from the WASM worker).
      if (msg.type === 'WASM_STATUS') return;
      if (msg.type === 'RESIZE') {
        const imageData = new ImageData(
          new Uint8ClampedArray(msg.buffer),
          msg.width,
          msg.height,
        );
        dispatch({ type: 'WORKER_RESPONSE', engine: 'ts', elapsedMs: msg.elapsed, imageData });
      } else {
        dispatch({ type: 'WORKER_ERROR', engine: 'ts', message: msg.message });
      }
    };
    wasmWorker.onerror = (e) =>
      dispatch({
        type: 'WORKER_ERROR',
        engine: 'wasm',
        message: e.message || 'Worker crashed',
      });
    tsWorker.onerror = (e) =>
      dispatch({
        type: 'WORKER_ERROR',
        engine: 'ts',
        message: e.message || 'Worker crashed',
      });

    wasmWorkerRef.current = wasmWorker;
    tsWorkerRef.current = tsWorker;

    return () => {
      wasmWorker.terminate();
      tsWorker.terminate();
    };
  }, []);

  // Load default sample on mount.
  useEffect(() => {
    urlToImageData('/samples/balloon.jpg').then((imageData) => {
      dispatch({ type: 'IMAGE_LOADED', imageData, sampleKey: 'balloon' });
    });
  }, []);

  // Main-thread elapsed ticker. One interval drives both engines.
  useEffect(() => {
    const anyRunning =
      state.runs.wasm.status === 'running' || state.runs.ts.status === 'running';

    if (!anyRunning) {
      if (tickerIntervalRef.current !== null) {
        window.clearInterval(tickerIntervalRef.current);
        tickerIntervalRef.current = null;
      }
      return;
    }
    if (tickerIntervalRef.current !== null) return;

    tickerIntervalRef.current = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'TICK', engine: 'wasm', elapsed: now - tickerStartRef.current.wasm });
      dispatch({ type: 'TICK', engine: 'ts', elapsed: now - tickerStartRef.current.ts });
    }, 100);
  }, [state.runs.wasm.status, state.runs.ts.status]);

  const handleSample = useCallback((key: 'balloon' | 'tower') => {
    urlToImageData(`/samples/${key}.jpg`).then((imageData) => {
      dispatch({ type: 'IMAGE_LOADED', imageData, sampleKey: key });
    });
  }, []);

  const handleUpload = useCallback((file: File) => {
    fileToImageData(file).then((imageData) => {
      dispatch({ type: 'IMAGE_LOADED', imageData, sampleKey: 'upload' });
    });
  }, []);

  const handleCarve = useCallback(() => {
    const { imageData, derivative, targetWidth, targetHeight, wasmAvailable } = state;
    if (!imageData) return;
    const now = performance.now();
    tickerStartRef.current = { wasm: now, ts: now };
    dispatch({ type: 'CARVE_STARTED' });

    function makeRequest(engine: 'wasm' | 'ts'): ResizeRequest {
      return {
        type: 'RESIZE',
        buffer: cloneBuffer(imageData!.data),
        width: imageData!.width,
        height: imageData!.height,
        derivative,
        targetWidth,
        targetHeight,
        engine,
      };
    }

    if (wasmAvailable && wasmWorkerRef.current) {
      const req = makeRequest('wasm');
      wasmWorkerRef.current.postMessage(req, [req.buffer]);
    }
    if (tsWorkerRef.current) {
      const req = makeRequest('ts');
      tsWorkerRef.current.postMessage(req, [req.buffer]);
    }
  }, [state]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'carved.png';
    a.click();
  }, []);

  const displayedImageData =
    state.activeTab === 'carved' ? state.carvedImageData : state.imageData;

  return (
    <div className="app">
      <Masthead />
      <Controls
        imageData={state.imageData}
        sampleKey={state.sampleKey}
        targetWidth={state.targetWidth}
        targetHeight={state.targetHeight}
        derivative={state.derivative}
        wasmStatusKnown={state.wasmStatusKnown}
        runs={state.runs}
        onSample={handleSample}
        onUpload={handleUpload}
        onTargetWidthChange={(v) => dispatch({ type: 'TARGET_WIDTH_CHANGED', value: v })}
        onTargetHeightChange={(v) => dispatch({ type: 'TARGET_HEIGHT_CHANGED', value: v })}
        onDerivativeChange={(v) => dispatch({ type: 'DERIVATIVE_CHANGED', value: v })}
        onCarve={handleCarve}
        onDownload={handleDownload}
      />
      <CanvasTabs
        activeTab={state.activeTab}
        originalSize={
          state.imageData ? { w: state.imageData.width, h: state.imageData.height } : null
        }
        carvedSize={
          state.carvedImageData
            ? { w: state.carvedImageData.width, h: state.carvedImageData.height }
            : null
        }
        onTabChange={(tab) => dispatch({ type: 'TAB_CHANGED', tab })}
      />
      <Canvas imageData={displayedImageData} canvasRef={canvasRef} />
      <TimingPanel runs={state.runs} wasmAvailable={state.wasmAvailable} />
      <Explainer />
    </div>
  );
}
```

- [ ] **Step 2: Type-check the whole project**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all existing tests to make sure we didn't regress the worker/algorithm layer**

```bash
npx vitest run
```

Expected: all tests pass, including the new `timing.test.ts` and `reducer.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat(ui): dual-worker parallel carving with reducer + live ticker"
```

---

## Task 15: Rewrite `app.css`

**Files:**

- Modify: `src/app.css` (full replacement)

- [ ] **Step 1: Replace the file**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #f5f5f4;
  --fg: #151515;
  --fg-muted: #767676;
  --fg-body: #2a2a2a;
  --surface: #ffffff;
  --border: #e3e3e3;
  --surface-alt: #e5e5e4;
  --accent: #151515;
  --accent-fg: #f5f5f4;

  --serif: 'STIX Two Text', Georgia, ui-serif, serif;
  --sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

html,
body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.55;
}

.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

/* Masthead */
.masthead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 24px;
}
.wordmark {
  font-family: var(--serif);
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1;
  text-transform: lowercase;
}
.tagline {
  font-family: var(--sans);
  font-size: 0.72rem;
  color: var(--fg-muted);
  letter-spacing: 0.08em;
  text-transform: lowercase;
}

/* Controls */
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 20px;
}
.control {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--sans);
}
.control-label {
  font-size: 0.68rem;
  color: var(--fg-muted);
  letter-spacing: 0.06em;
}
.control input[type='number'],
.control select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--fg);
  width: 100px;
}
.control select {
  width: auto;
  min-width: 110px;
}
.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 3px;
  font-family: var(--sans);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-end;
}
.btn-primary {
  background: var(--accent);
  color: var(--accent-fg);
}
.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.btn-secondary {
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--border);
}

/* Canvas tabs */
.canvas-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 0;
}
.canvas-tab {
  padding: 6px 14px;
  border: none;
  border-radius: 3px 3px 0 0;
  background: var(--surface-alt);
  color: var(--fg-muted);
  font-family: var(--sans);
  font-size: 0.72rem;
  cursor: pointer;
}
.canvas-tab:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.canvas-tab--active {
  background: var(--accent);
  color: var(--accent-fg);
}

/* Canvas */
.canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  background: var(--surface-alt);
  border-radius: 0 3px 3px 3px;
  margin-bottom: 22px;
}

/* Timing panel */
.timing-panel {
  display: flex;
  gap: 10px;
  margin-bottom: 32px;
  font-family: var(--sans);
}
.timing-card {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 14px 18px;
}
.timing-card--speedup {
  flex: 0 0 120px;
  background: var(--accent);
  color: var(--accent-fg);
  border-color: var(--accent);
  text-align: center;
}
.timing-label {
  font-size: 0.65rem;
  color: var(--fg-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.timing-card--speedup .timing-label {
  color: var(--accent-fg);
  opacity: 0.75;
}
.timing-value {
  font-family: var(--serif);
  font-size: 1.6rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.timing-error {
  font-size: 0.7rem;
  color: var(--fg-muted);
  margin-top: 4px;
}

/* Explainer */
.explainer {
  border-top: 1px solid var(--border);
  padding-top: 24px;
}
.explainer-label {
  font-family: var(--sans);
  font-size: 0.68rem;
  color: var(--fg-muted);
  letter-spacing: 0.1em;
  text-transform: lowercase;
  margin-bottom: 16px;
}
.explainer-step {
  margin-bottom: 18px;
}
.explainer-step:last-child {
  margin-bottom: 0;
}
.explainer-step-title {
  font-family: var(--serif);
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: lowercase;
  margin-bottom: 5px;
}
.explainer-step-body {
  font-family: var(--serif);
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--fg-body);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app.css
git commit -m "style: rewrite app.css for academic-manuscript aesthetic"
```

---

## Task 16: Manual UI verification + commit any polish

**Files:**

- Possibly: `src/app.css`, minor component tweaks

Per the project CLAUDE.md, type-checks and tests verify code correctness, not feature correctness. Manual UI checks are required.

- [ ] **Step 1: Build WASM and start the dev server**

```bash
npm run dev
```

Wait for Vite to print the local URL.

- [ ] **Step 2: Golden path — balloon, Sobel, modest resize**

1. Open the dev URL in a browser.
2. Verify masthead reads `carver` / `seam carving · wasm vs typescript`.
3. Sample picker should show Balloon. Width and Height inputs should equal balloon's native size.
4. Original tab should be active with the balloon rendered on the canvas.
5. Set Width to roughly 60% of native, Height unchanged.
6. Click **Carve**. Both timing slots should show ticking values. Carved tab becomes active and fills in once WASM finishes. TS fills in some seconds later; the `Faster` card appears with a multiplier.
7. Click **Original** tab → canvas switches back to the source image.
8. Click **Carved** tab → back to the carved image. Click **Download** → saves `carved.png`.

Expected: every step works. If any CSS looks off (spacing, alignment, cramped controls row), adjust `src/app.css` accordingly.

- [ ] **Step 3: Tower sample**

Switch sample to Tower. Dimensions update. Carve to a smaller target. Both engines run; result and timings update.

- [ ] **Step 4: Upload path**

Sample picker → `Upload…` → pick any local image. It should load into the canvas with its native dimensions. Carve works.

- [ ] **Step 5: WASM-unavailable path (simulated)**

Temporarily force a WASM init failure: in `src/worker/carver.worker.ts`, replace `init(wasmUrl)` with `Promise.reject(new Error('simulated'))` just for this test, save, let Vite HMR. Verify: WASM slot shows `Unavailable`, Carve still enables (once status arrives), only TS runs, carved result still renders. **Revert the change** before committing.

- [ ] **Step 6: Error path (optional)**

Set Width to 0 and Height to 0. Carve should stay disabled. Set equal to native. Carve stays disabled.

- [ ] **Step 7: Commit any polish**

If you tweaked CSS or small component bits during manual checks:

```bash
git add -u
git commit -m "style: manual-verification polish"
```

(If nothing changed, skip the commit.)

---

## Self-review notes

**Spec coverage:**

- Stacked layout → Tasks 7, 10, 13, 15 (Masthead, CanvasTabs, Canvas, CSS)
- Parallel dual-engine → Task 14
- Timing panel + speedup → Tasks 4, 9, 15
- Sample picker with bundled samples + upload → Tasks 1, 6, 11
- Original/Carved tabs → Task 10 + wire-up in 14
- Explainer (prose, four steps) → Task 8
- Removed Engine dropdown → Task 12
- STIX Two Text + title → Task 2
- Neutral grey palette, Title Case controls, lowercase headings → Task 15
- State shape with `wasmStatusKnown`, deterministic carved-image selection → Task 5
- `WASM_STATUS`-gated Carve → Task 12 (`isCarveDisabled` checks `wasmStatusKnown`)
- Two-buffer postMessage → Task 14 (`cloneBuffer` called twice)
- Edge cases: unavailable, error, disabled states → Tasks 5, 9, 12

**Type-consistency:**

- `EngineKey` = `'ts' | 'wasm'` used in `types.ts`, `reducer.ts`, `App.tsx` — matches.
- `SampleKey` = `'balloon' | 'tower' | 'upload'` used in `reducer.ts`, `Controls.tsx`, `SamplePicker.tsx`, `App.tsx` — matches.
- `runs: EngineRuns` prop used by `TimingPanel` and `Controls` — matches shape from `types.ts`.
- `onSample: (key: 'balloon' | 'tower') => void` — narrower than `SampleKey` because `'upload'` is handled via file-input inside `SamplePicker`. Consistent across `SamplePicker.tsx`, `Controls.tsx`, `App.tsx`.

**Placeholder scan:** none found; all code blocks are complete.
