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
