import type {
  Derivative,
  Engine,
  EngineRuns,
  EngineRunState,
  VisualizerStage,
  VisualizerFrame,
  PlaybackSpeed,
} from '../types';

export interface VizState {
  status: 'idle' | 'computing' | 'ready' | 'error';
  totalSeams: number;
  currentSeam: number;
  currentStage: VisualizerStage;
  frame: VisualizerFrame | null;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  // The gradient operator the carve used — drives the energy stage explanation.
  derivative: Derivative;
  errorMessage: string | null;
}

const initialVizState: VizState = {
  status: 'idle',
  totalSeams: 0,
  currentSeam: 0,
  currentStage: 'image',
  frame: null,
  isPlaying: false,
  speed: 1,
  derivative: 'sobel',
  errorMessage: null,
};

export type SampleKey = 'balloon' | 'tower' | 'upload';

/** `'checking'` until the WASM worker's init promise resolves (pass or fail). */
export type WasmAvailability = 'checking' | 'available' | 'unavailable';

export interface UiState {
  imageData: ImageData | null;
  carvedImageData: ImageData | null;
  activeTab: 'original' | 'carved';
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  sampleKey: SampleKey;
  wasm: WasmAvailability;
  runs: EngineRuns;
  imageLoadError: string | null;
  viz: VizState;
}

export type Action =
  | { type: 'IMAGE_LOADED'; imageData: ImageData; sampleKey: SampleKey }
  | { type: 'IMAGE_LOAD_ERROR'; message: string }
  | { type: 'TARGET_WIDTH_CHANGED'; value: number }
  | { type: 'TARGET_HEIGHT_CHANGED'; value: number }
  | { type: 'DERIVATIVE_CHANGED'; value: Derivative }
  | { type: 'TAB_CHANGED'; tab: 'original' | 'carved' }
  | { type: 'CARVE_STARTED' }
  | { type: 'TICK'; engine: Engine; elapsed: number }
  | {
      type: 'WORKER_RESPONSE';
      engine: Engine;
      elapsedMs: number;
      imageData: ImageData;
    }
  | { type: 'WORKER_ERROR'; engine: Engine; message: string }
  | { type: 'WASM_STATUS'; available: boolean }
  | { type: 'VISUALIZE_READY'; totalSeams: number }
  | { type: 'VISUALIZE_FRAME'; frame: VisualizerFrame }
  | { type: 'VISUALIZE_ERROR'; message: string }
  | { type: 'VISUALIZE_STAGE_CHANGED'; stage: VisualizerStage }
  | { type: 'VISUALIZE_SEAM_CHANGED'; seam: number }
  | { type: 'VISUALIZE_PLAY_TOGGLED' }
  | { type: 'VISUALIZE_SPEED_CHANGED'; speed: PlaybackSpeed };

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
  wasm: 'checking',
  runs: { wasm: idleEngineRun, ts: idleEngineRun },
  imageLoadError: null,
  viz: initialVizState,
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
        imageLoadError: null,
      };
    case 'IMAGE_LOAD_ERROR':
      return { ...state, imageLoadError: action.message };
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
          wasm:
            state.wasm === 'available'
              ? { status: 'running', elapsedMs: null, tickerMs: 0, errorMessage: null }
              : { status: 'unavailable', elapsedMs: null, tickerMs: null, errorMessage: null },
          ts: { status: 'running', elapsedMs: null, tickerMs: 0, errorMessage: null },
        },
        viz: { ...initialVizState, status: 'computing', derivative: state.derivative },
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
      // Drop stale responses: only accept while this engine is still 'running'.
      // Otherwise a late response from a previous carve (or one in-flight
      // when the image was swapped) would overwrite the new state.
      if (state.runs[action.engine].status !== 'running') return state;
      const nextRun: EngineRunState = {
        status: 'done',
        elapsedMs: action.elapsedMs,
        tickerMs: null,
        errorMessage: null,
      };
      // WASM's 'done' result wins. TS's result renders whenever WASM hasn't
      // produced a 'done' yet — covers WASM unavailable, errored, still
      // running (race), or never started.
      const useThisResult = action.engine === 'wasm' || state.runs.wasm.status !== 'done';
      return {
        ...state,
        carvedImageData: useThisResult ? action.imageData : state.carvedImageData,
        runs: { ...state.runs, [action.engine]: nextRun },
      };
    }
    case 'WORKER_ERROR':
      // Same staleness guard as WORKER_RESPONSE — a late onerror after a
      // successful 'done' run must not clobber elapsedMs / the rendered image.
      if (state.runs[action.engine].status !== 'running') return state;
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
      return { ...state, wasm: action.available ? 'available' : 'unavailable' };
    case 'VISUALIZE_READY':
      return {
        ...state,
        viz: { ...state.viz, status: 'ready', totalSeams: action.totalSeams, errorMessage: null },
      };
    case 'VISUALIZE_FRAME':
      return {
        ...state,
        viz: { ...state.viz, frame: action.frame, currentSeam: action.frame.seam },
      };
    case 'VISUALIZE_ERROR':
      return {
        ...state,
        viz: { ...state.viz, status: 'error', isPlaying: false, errorMessage: action.message },
      };
    case 'VISUALIZE_STAGE_CHANGED':
      return { ...state, viz: { ...state.viz, currentStage: action.stage } };
    case 'VISUALIZE_SEAM_CHANGED':
      return { ...state, viz: { ...state.viz, currentSeam: action.seam } };
    case 'VISUALIZE_PLAY_TOGGLED':
      return { ...state, viz: { ...state.viz, isPlaying: !state.viz.isPlaying } };
    case 'VISUALIZE_SPEED_CHANGED':
      return { ...state, viz: { ...state.viz, speed: action.speed } };
  }
}
