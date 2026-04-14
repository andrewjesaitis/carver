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
      <div className="canvas-area" style={canvasAreaStyle}>
        <Canvas imageData={displayedImageData} canvasRef={canvasRef} style={canvasStyle} />
      </div>
      <TimingPanel runs={state.runs} wasmAvailable={state.wasmAvailable} />
      <Explainer />
    </div>
  );
}
