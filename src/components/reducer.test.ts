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

  test('clears a previous imageLoadError on successful load', () => {
    const s: UiState = { ...initialState, imageLoadError: 'old failure' };
    const next = reducer(s, {
      type: 'IMAGE_LOADED',
      imageData: seedImageData(4, 4),
      sampleKey: 'balloon',
    });
    expect(next.imageLoadError).toBeNull();
  });
});

describe('IMAGE_LOAD_ERROR', () => {
  test('records the error message', () => {
    const next = reducer(initialState, { type: 'IMAGE_LOAD_ERROR', message: 'decode failed' });
    expect(next.imageLoadError).toBe('decode failed');
  });

  test('does not blow away the previously-loaded image', () => {
    const img = seedImageData(4, 4);
    const s: UiState = { ...initialState, imageData: img };
    const next = reducer(s, { type: 'IMAGE_LOAD_ERROR', message: 'bad upload' });
    expect(next.imageData).toBe(img);
    expect(next.imageLoadError).toBe('bad upload');
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

  test('stale response after IMAGE_LOADED is dropped (engine no longer running)', () => {
    // Simulates: user loads a new image while a previous carve is still
    // in flight. The previous carve's response must not overwrite the new
    // image's blank canvas.
    const newImg = seedImageData(10, 10);
    const staleResult = seedImageData(3, 3);
    let s = initialState;
    s = reducer(s, { type: 'IMAGE_LOADED', imageData: newImg, sampleKey: 'tower' });
    expect(s.runs.wasm.status).toBe('idle');
    const next = reducer(s, {
      type: 'WORKER_RESPONSE',
      engine: 'wasm',
      elapsedMs: 99,
      imageData: staleResult,
    });
    expect(next).toBe(s);
    expect(next.carvedImageData).toBeNull();
  });

  test('late response after engine already done is dropped', () => {
    // A duplicate/late response from a worker that already completed must
    // not overwrite the displayed result or its elapsedMs.
    const firstResult = seedImageData(3, 3);
    const lateResult = seedImageData(3, 3);
    const s: UiState = {
      ...initialState,
      wasm: 'available',
      carvedImageData: firstResult,
      runs: {
        wasm: { status: 'done', elapsedMs: 42, tickerMs: null, errorMessage: null },
        ts: { status: 'done', elapsedMs: 420, tickerMs: null, errorMessage: null },
      },
    };
    const next = reducer(s, {
      type: 'WORKER_RESPONSE',
      engine: 'wasm',
      elapsedMs: 999,
      imageData: lateResult,
    });
    expect(next).toBe(s);
    expect(next.carvedImageData).toBe(firstResult);
    expect(next.runs.wasm.elapsedMs).toBe(42);
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

  test('late error after engine already done is dropped (preserves elapsedMs and image)', () => {
    // A worker `onerror` arriving after a successful 'done' run must not
    // flip the run to 'error' or wipe elapsedMs — the user is staring at
    // that engine's image and the speedup should still display.
    const result = seedImageData(3, 3);
    const s: UiState = {
      ...initialState,
      carvedImageData: result,
      runs: {
        wasm: { status: 'done', elapsedMs: 42, tickerMs: null, errorMessage: null },
        ts: running,
      },
    };
    const next = reducer(s, { type: 'WORKER_ERROR', engine: 'wasm', message: 'late crash' });
    expect(next).toBe(s);
    expect(next.runs.wasm.elapsedMs).toBe(42);
    expect(next.runs.wasm.status).toBe('done');
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

import type { VisualizerFrame } from '../types';

function makeVizFrame(seam = 0): VisualizerFrame {
  const data = new Uint8ClampedArray(4 * 4 * 4).fill(128);
  const img = new ImageData(data, 4, 4);
  return {
    seam,
    imageData: img,
    greyscaleMap: img,
    energyMap: img,
    costHeatmap: img,
    seamPath: [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ],
    kernelSample: {
      pixels: new Array(9).fill(128),
      gx: 0,
      gy: 0,
      magnitude: 0,
      centerX: 2,
      centerY: 2,
    },
    costDetail: {
      costs: new Array(49).fill(100),
      arrowDirs: new Array(49).fill('up' as const),
      gridWidth: 7,
      gridHeight: 7,
      minIndex: 24,
      orientation: 'vertical' as const,
    },
  };
}

describe('viz reducer', () => {
  test('CARVE_STARTED resets viz to computing', () => {
    const s: UiState = {
      ...initialState,
      wasm: 'available',
      derivative: 'simple',
      viz: {
        status: 'ready',
        totalSeams: 10,
        currentSeam: 5,
        currentStage: 'cost',
        frame: makeVizFrame(),
        isPlaying: false,
        speed: 1,
        derivative: 'sobel',
        errorMessage: null,
      },
    };
    const next = reducer(s, { type: 'CARVE_STARTED' });
    expect(next.viz.status).toBe('computing');
    expect(next.viz.currentSeam).toBe(0);
    expect(next.viz.frame).toBeNull();
    // viz.derivative is captured from the carve's selected gradient.
    expect(next.viz.derivative).toBe('simple');
  });

  test('VISUALIZE_READY sets status to ready and totalSeams', () => {
    const next = reducer(initialState, { type: 'VISUALIZE_READY', totalSeams: 42 });
    expect(next.viz.status).toBe('ready');
    expect(next.viz.totalSeams).toBe(42);
  });

  test('VISUALIZE_FRAME stores the frame', () => {
    const frame = makeVizFrame(3);
    const next = reducer(initialState, { type: 'VISUALIZE_FRAME', frame });
    expect(next.viz.frame).toBe(frame);
    expect(next.viz.currentSeam).toBe(3);
  });

  test('VISUALIZE_ERROR sets error status, message, and stops playback', () => {
    const s: UiState = {
      ...initialState,
      viz: { ...initialState.viz, status: 'computing', isPlaying: true },
    };
    const next = reducer(s, { type: 'VISUALIZE_ERROR', message: 'boom' });
    expect(next.viz.status).toBe('error');
    expect(next.viz.errorMessage).toBe('boom');
    expect(next.viz.isPlaying).toBe(false);
  });

  test('VISUALIZE_STAGE_CHANGED updates currentStage', () => {
    const next = reducer(initialState, { type: 'VISUALIZE_STAGE_CHANGED', stage: 'energy' });
    expect(next.viz.currentStage).toBe('energy');
  });

  test('VISUALIZE_SEAM_CHANGED updates currentSeam', () => {
    const next = reducer(initialState, { type: 'VISUALIZE_SEAM_CHANGED', seam: 7 });
    expect(next.viz.currentSeam).toBe(7);
  });

  test('VISUALIZE_PLAY_TOGGLED flips isPlaying', () => {
    const next = reducer(initialState, { type: 'VISUALIZE_PLAY_TOGGLED' });
    expect(next.viz.isPlaying).toBe(true);
    const next2 = reducer(next, { type: 'VISUALIZE_PLAY_TOGGLED' });
    expect(next2.viz.isPlaying).toBe(false);
  });

  test('VISUALIZE_SPEED_CHANGED updates speed', () => {
    const next = reducer(initialState, { type: 'VISUALIZE_SPEED_CHANGED', speed: 4 });
    expect(next.viz.speed).toBe(4);
  });
});
