# Carver

Seam carving (content-aware image resizing) web app.

- **Phase 1 (current):** Vite + React + TypeScript baseline
- **Phase 2 (planned):** Rust/WASM seam carving pipeline, toggled against the TS version at runtime
- **Phase 3 (planned):** Visualizer — step-through mode, canvas overlay visualizations, playback controls (play/pause/speed/step)
- **Phase 4 (planned):** Polish — responsive UI, drag-and-drop upload, before/after slider comparison; maybe vertical seam carving and content amplification

## Stack
- Vite, React, TypeScript (strict)
- Vitest for tests (co-located with source: `src/algorithm/carver.test.ts`)
- Web Worker for all image compute (no main-thread blocking)

## Conventions
- Algorithm lives in `src/algorithm/carver.ts` — pure functions, no DOM deps
- Shared types in `src/types.ts`
- In production, the worker is the only consumer of the algorithm module (tests also import it directly)
- Components own no compute logic; all image processing goes through the worker
- Plain React hooks for state; no state management library
- Worker uses `/// <reference lib="webworker" />` instead of adding WebWorker to tsconfig lib
