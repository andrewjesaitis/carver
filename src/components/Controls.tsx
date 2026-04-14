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
