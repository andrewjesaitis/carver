import React, { useEffect, useReducer, useRef, useCallback } from 'react';
import type {
  Engine,
  ResizeRequest,
  ResizeResponse,
  ResizeError,
  WasmStatus,
  VisualizeInit,
  VisualizeSeek,
  VisualizeReady,
  VisualizeFrameMsg,
  VisualizeError,
  VisualizerFrame,
  VisualizerStage,
  PlaybackSpeed,
} from '../types';
import Masthead from './Masthead';
import Controls from './Controls';
import CanvasTabs from './CanvasTabs';
import Canvas from './Canvas';
import TimingPanel from './TimingPanel';
import Visualizer from './Visualizer';
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
  const vizWorkerRef = useRef<Worker | null>(null);
  const tickerStartRef = useRef<{ wasm: number; ts: number }>({ wasm: 0, ts: 0 });

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

    // Both workers run the same source and both emit WASM_STATUS on init. We
    // only listen to the WASM-pinned worker's status; the TS worker's is
    // ignored so we don't double-dispatch.
    function makeOnMessage(engine: Engine, trackWasmStatus: boolean) {
      return (e: MessageEvent<ResizeResponse | ResizeError | WasmStatus>) => {
        const msg = e.data;
        if (msg.type === 'WASM_STATUS') {
          if (trackWasmStatus) dispatch({ type: 'WASM_STATUS', available: msg.available });
          return;
        }
        if (msg.type === 'RESIZE') {
          const imageData = new ImageData(new Uint8ClampedArray(msg.buffer), msg.width, msg.height);
          dispatch({ type: 'WORKER_RESPONSE', engine, elapsedMs: msg.elapsed, imageData });
          return;
        }
        // Exhaustive: the only remaining discriminant is 'RESIZE_ERROR'.
        dispatch({ type: 'WORKER_ERROR', engine, message: msg.message });
      };
    }
    wasmWorker.onmessage = makeOnMessage('wasm', true);
    tsWorker.onmessage = makeOnMessage('ts', false);
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

  useEffect(() => {
    urlToImageData(`${import.meta.env.BASE_URL}samples/balloon.jpg`)
      .then((imageData) => dispatch({ type: 'IMAGE_LOADED', imageData, sampleKey: 'balloon' }))
      .catch((err: Error) => dispatch({ type: 'IMAGE_LOAD_ERROR', message: err.message }));
  }, []);

  useEffect(() => {
    const anyRunning = state.runs.wasm.status === 'running' || state.runs.ts.status === 'running';
    if (!anyRunning) return;
    const interval = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'TICK', engine: 'wasm', elapsed: now - tickerStartRef.current.wasm });
      dispatch({ type: 'TICK', engine: 'ts', elapsed: now - tickerStartRef.current.ts });
    }, 100);
    return () => window.clearInterval(interval);
  }, [state.runs.wasm.status, state.runs.ts.status]);

  const {
    imageData: currentImageData,
    derivative: currentDerivative,
    targetWidth: currentTargetWidth,
    targetHeight: currentTargetHeight,
  } = state;

  useEffect(() => {
    // If the TS carve failed there's nothing to visualize — surface it instead
    // of leaving the section stuck on "Computing…".
    if (state.runs.ts.status === 'error') {
      dispatch({
        type: 'VISUALIZE_ERROR',
        message: 'The carve failed, so the visualizer is unavailable.',
      });
      return;
    }
    if (state.runs.ts.status !== 'done' || !currentImageData) return;

    const vizWorker = new Worker(new URL('../worker/carver.worker.ts', import.meta.url), {
      type: 'module',
      name: 'carver-viz',
    });

    vizWorker.onmessage = (
      e: MessageEvent<VisualizeReady | VisualizeFrameMsg | VisualizeError>,
    ) => {
      const msg = e.data;
      if (msg.type === 'VISUALIZE_READY') {
        dispatch({ type: 'VISUALIZE_READY', totalSeams: msg.totalSeams });
        return;
      }
      if (msg.type === 'VISUALIZE_ERROR') {
        dispatch({ type: 'VISUALIZE_ERROR', message: msg.message });
        return;
      }
      if (msg.type === 'VISUALIZE_FRAME') {
        const frame: VisualizerFrame = {
          seam: msg.seam,
          imageData: new ImageData(new Uint8ClampedArray(msg.imageBuffer), msg.width, msg.height),
          greyscaleMap: new ImageData(
            new Uint8ClampedArray(msg.greyscaleBuffer),
            msg.width,
            msg.height,
          ),
          energyMap: new ImageData(new Uint8ClampedArray(msg.energyBuffer), msg.width, msg.height),
          costHeatmap: new ImageData(new Uint8ClampedArray(msg.costBuffer), msg.width, msg.height),
          seamPath: msg.seamPath,
          kernelSample: msg.kernelSample,
          costDetail: msg.costDetail,
        };
        dispatch({ type: 'VISUALIZE_FRAME', frame });
      }
    };

    vizWorker.onerror = (e) =>
      dispatch({ type: 'VISUALIZE_ERROR', message: e.message || 'Visualizer worker crashed' });

    vizWorkerRef.current = vizWorker;

    const req: VisualizeInit = {
      type: 'VISUALIZE_INIT',
      buffer: cloneBuffer(currentImageData.data),
      width: currentImageData.width,
      height: currentImageData.height,
      derivative: currentDerivative,
      targetWidth: currentTargetWidth,
      targetHeight: currentTargetHeight,
    };
    vizWorker.postMessage(req, [req.buffer]);

    return () => vizWorker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.runs.ts.status]); // intentionally narrow — fires once per TS carve completion

  useEffect(() => {
    if (state.viz.status !== 'ready' || !vizWorkerRef.current) return;
    vizWorkerRef.current.postMessage({
      type: 'VISUALIZE_SEEK',
      seam: state.viz.currentSeam,
    } satisfies VisualizeSeek);
  }, [state.viz.currentSeam, state.viz.status]);

  const handleSample = useCallback((key: 'balloon' | 'tower') => {
    urlToImageData(`${import.meta.env.BASE_URL}samples/${key}.jpg`)
      .then((imageData) => dispatch({ type: 'IMAGE_LOADED', imageData, sampleKey: key }))
      .catch((err: Error) => dispatch({ type: 'IMAGE_LOAD_ERROR', message: err.message }));
  }, []);

  const handleUpload = useCallback((file: File) => {
    fileToImageData(file)
      .then((imageData) => dispatch({ type: 'IMAGE_LOADED', imageData, sampleKey: 'upload' }))
      .catch((err: Error) => dispatch({ type: 'IMAGE_LOAD_ERROR', message: err.message }));
  }, []);

  // Narrow the dep list so handleCarve's identity doesn't change on every
  // 100ms TICK dispatch (which would re-render Controls each tick).
  const { imageData, derivative, targetWidth, targetHeight, wasm: wasmStatus } = state;
  const handleCarve = useCallback(() => {
    if (!imageData) return;
    const now = performance.now();
    tickerStartRef.current = { wasm: now, ts: now };
    dispatch({ type: 'CARVE_STARTED' });

    function makeRequest(engine: Engine): ResizeRequest {
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

    if (wasmStatus === 'available' && wasmWorkerRef.current) {
      const req = makeRequest('wasm');
      wasmWorkerRef.current.postMessage(req, [req.buffer]);
    }
    if (tsWorkerRef.current) {
      const req = makeRequest('ts');
      tsWorkerRef.current.postMessage(req, [req.buffer]);
    }
  }, [imageData, derivative, targetWidth, targetHeight, wasmStatus]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'carved.png';
    a.click();
  }, []);

  const handleStageChange = useCallback((stage: VisualizerStage) => {
    dispatch({ type: 'VISUALIZE_STAGE_CHANGED', stage });
  }, []);

  const handleSeamChange = useCallback((seam: number) => {
    dispatch({ type: 'VISUALIZE_SEAM_CHANGED', seam });
  }, []);

  const handlePlayToggle = useCallback(() => {
    dispatch({ type: 'VISUALIZE_PLAY_TOGGLED' });
  }, []);

  const handleSpeedCycle = useCallback(() => {
    const speeds: PlaybackSpeed[] = [0.5, 1, 2, 4];
    const next = speeds[(speeds.indexOf(state.viz.speed) + 1) % speeds.length];
    dispatch({ type: 'VISUALIZE_SPEED_CHANGED', speed: next });
  }, [state.viz.speed]);

  const displayedImageData = state.activeTab === 'carved' ? state.carvedImageData : state.imageData;

  // The canvas-area wrapper is sized to the SOURCE image's native dimensions
  // (capped to container width). The canvas inside is rendered as a percentage
  // of the wrapper based on how large the displayed bitmap is relative to the
  // source — so the Original fills the wrapper exactly (no whitespace) and the
  // Carved result visibly occupies less of the same fixed area.
  const canvasAreaStyle: React.CSSProperties | undefined = state.imageData
    ? {
        width: '100%',
        maxWidth: `${state.imageData.width}px`,
        aspectRatio: `${state.imageData.width} / ${state.imageData.height}`,
      }
    : undefined;

  const canvasStyle: React.CSSProperties | undefined =
    state.imageData && displayedImageData
      ? {
          width: `${(displayedImageData.width / state.imageData.width) * 100}%`,
          height: `${(displayedImageData.height / state.imageData.height) * 100}%`,
        }
      : undefined;

  return (
    <div className="app">
      <Masthead />
      {state.imageLoadError && (
        <div className="image-load-error" role="alert">
          <strong>Couldn't load image.</strong> {state.imageLoadError}
        </div>
      )}
      <Controls
        imageData={state.imageData}
        sampleKey={state.sampleKey}
        targetWidth={state.targetWidth}
        targetHeight={state.targetHeight}
        derivative={state.derivative}
        wasmStatusKnown={state.wasm !== 'checking'}
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
      <div className="canvas-area" style={canvasAreaStyle}>
        <Canvas imageData={displayedImageData} canvasRef={canvasRef} style={canvasStyle} />
      </div>
      <TimingPanel runs={state.runs} wasmAvailable={state.wasm === 'available'} />
      <Visualizer
        viz={state.viz}
        originalWidth={state.imageData?.width ?? 0}
        originalHeight={state.imageData?.height ?? 0}
        onStageChange={handleStageChange}
        onSeamChange={handleSeamChange}
        onPlayToggle={handlePlayToggle}
        onSpeedCycle={handleSpeedCycle}
      />
    </div>
  );
}
