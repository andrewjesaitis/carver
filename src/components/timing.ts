export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function computeSpeedup(wasmMs: number, tsMs: number): string {
  return `${(tsMs / wasmMs).toFixed(1)}×`;
}
