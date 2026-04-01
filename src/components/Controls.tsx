import React from 'react';
import type { Derivative, Engine } from '../types';

interface ControlsProps {
  imageData: ImageData | null;
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  engine: Engine;
  wasmAvailable: boolean;
  elapsed: number | null;
  status: 'idle' | 'processing' | 'error';
  onUpload: (file: File) => void;
  onTargetWidthChange: (w: number) => void;
  onTargetHeightChange: (h: number) => void;
  onDerivativeChange: (d: Derivative) => void;
  onEngineChange: (e: Engine) => void;
  onResize: () => void;
  onDownload: () => void;
}

/** Returns true when the Carve button should be disabled. */
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

/** Upload, dimension, gradient, and action controls for the seam carving workflow. */
export default function Controls({
  imageData,
  targetWidth,
  targetHeight,
  derivative,
  engine,
  wasmAvailable,
  elapsed,
  status,
  onUpload,
  onTargetWidthChange,
  onTargetHeightChange,
  onDerivativeChange,
  onEngineChange,
  onResize,
  onDownload,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="control-group">
        <label>
          Image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
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
            onChange={(e) => onTargetWidthChange(Number(e.target.value))}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            value={targetHeight}
            min={1}
            max={imageData?.height ?? undefined}
            onChange={(e) => onTargetHeightChange(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="control-group">
        <label>
          Gradient
          <select
            value={derivative}
            onChange={(e) => onDerivativeChange(e.target.value as Derivative)}
          >
            <option value="sobel">Sobel</option>
            <option value="simple">Simple</option>
          </select>
        </label>
      </div>

      <div className="control-group">
        <label>
          Engine
          <select
            value={engine}
            onChange={(e) => onEngineChange(e.target.value as Engine)}
          >
            <option value="ts">TypeScript</option>
            <option value="wasm" disabled={!wasmAvailable}>
              WASM{!wasmAvailable ? ' (unavailable)' : ''}
            </option>
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
        <button onClick={onDownload} disabled={!imageData}>
          Download
        </button>
      </div>

      {status === 'error' && (
        <p className="error">Something went wrong. Try a different image or dimensions.</p>
      )}

      {elapsed !== null && status === 'idle' && (
        <p className="elapsed">Carved in {elapsed}ms</p>
      )}
    </div>
  );
}
