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
  test('records availability as "available" on init success', () => {
    const next = reducer(initialState, { type: 'WASM_STATUS', available: true });
    expect(next.wasm).toBe('available');
  });

  test('records availability as "unavailable" on init failure', () => {
    const next = reducer(initialState, { type: 'WASM_STATUS', available: false });
    expect(next.wasm).toBe('unavailable');
  });

  test('initialState starts as "checking"', () => {
    expect(initialState.wasm).toBe('checking');
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
    const s: UiState = { ...initialState, wasm: 'available' };
    const next = reducer(s, { type: 'CARVE_STARTED' });
    expect(next.runs.wasm.status).toBe('running');
    expect(next.runs.ts.status).toBe('running');
    expect(next.activeTab).toBe('carved');
    expect(next.carvedImageData).toBeNull();
  });

  test('only TS runs when WASM is unavailable', () => {
    const s: UiState = { ...initialState, wasm: 'unavailable' };
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
      wasm: 'available',
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
      wasm: 'available',
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
      wasm: 'unavailable',
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

  test('TS response DOES render when WASM errored at runtime', () => {
    const tsImg = seedImageData(3, 3);
    const s: UiState = {
      ...initialState,
      wasm: 'available',
      carvedImageData: null,
      runs: {
        wasm: { status: 'error', elapsedMs: null, tickerMs: null, errorMessage: 'trap' },
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
    expect(next.runs.ts.status).toBe('done');
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
