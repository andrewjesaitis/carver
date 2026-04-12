import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Derivative, Engine, ResizeResponse, ResizeError, WasmStatus } from '../types';
import Canvas from './Canvas';
import Controls from './Controls';
import '../app.css';

interface AppState {
  imageData: ImageData | null;
  status: 'idle' | 'processing' | 'error';
  errorMessage: string | null;
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  engine: Engine;
  wasmAvailable: boolean;
  elapsed: number | null;
}

/** Loads a File into an ImageData by drawing it onto an offscreen canvas. */
function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
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
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Root application component — manages worker lifecycle and top-level state. */
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
    // Optimistic default: worker falls back to TS if a resize fires before init completes.
    engine: 'wasm',
    wasmAvailable: false,
    elapsed: null,
  });

  useEffect(() => {
    const worker = new Worker(new URL('../worker/carver.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onerror = (event) => {
      console.error('[carver] worker error:', event.message, event);
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: event.message || 'Worker crashed unexpectedly.',
      }));
    };
    worker.onmessage = (event: MessageEvent<ResizeResponse | ResizeError | WasmStatus>) => {
      const msg = event.data;
      if (msg.type === 'WASM_STATUS') {
        setState((prev) => ({
          ...prev,
          wasmAvailable: msg.available,
          // Preserve user's selection; force 'ts' only when WASM is unavailable.
          engine: msg.available ? prev.engine : 'ts',
        }));
      } else if (msg.type === 'RESIZE') {
        const imageData = new ImageData(new Uint8ClampedArray(msg.buffer), msg.width, msg.height);
        setState((prev) => ({ ...prev, imageData, status: 'idle', elapsed: msg.elapsed }));
      } else {
        setState((prev) => ({
          ...prev,
          imageData: null,
          status: 'error',
          errorMessage: msg.message,
        }));
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    const imageData = await fileToImageData(file);
    setState((prev) => ({
      ...prev,
      imageData,
      status: 'idle',
      errorMessage: null,
      targetWidth: imageData.width,
      targetHeight: imageData.height,
    }));
  }, []);

  const handleResize = useCallback(() => {
    const { imageData, derivative, targetWidth, targetHeight, engine } = state;
    if (!imageData || !workerRef.current) return;
    const buffer = imageData.data.buffer;
    setState((prev) => ({ ...prev, imageData: null, status: 'processing', elapsed: null }));
    workerRef.current.postMessage(
      {
        type: 'RESIZE',
        buffer,
        width: imageData.width,
        height: imageData.height,
        derivative,
        targetWidth,
        targetHeight,
        engine,
      },
      [buffer],
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
        engine={state.engine}
        wasmAvailable={state.wasmAvailable}
        elapsed={state.elapsed}
        status={state.status}
        onUpload={handleUpload}
        onTargetWidthChange={(w) => setState((prev) => ({ ...prev, targetWidth: w }))}
        onTargetHeightChange={(h) => setState((prev) => ({ ...prev, targetHeight: h }))}
        onDerivativeChange={(d) => setState((prev) => ({ ...prev, derivative: d }))}
        onEngineChange={(e) => setState((prev) => ({ ...prev, engine: e }))}
        onResize={handleResize}
        onDownload={handleDownload}
      />
      <Canvas imageData={state.imageData} canvasRef={canvasRef} />
    </div>
  );
}
