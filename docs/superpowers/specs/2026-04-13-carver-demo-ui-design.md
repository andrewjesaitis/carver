# Carver Demo UI — Design Spec

- **Date:** 2026-04-13
- **Branch:** `feat/rust-wasm-seam-carving`
- **Status:** Proposed. Replaces the current developer-oriented UI with a portfolio-grade demo.

## Purpose

Replace the current functional-but-developer-style interface with a minimal, polished demo surface that showcases the TypeScript vs. WebAssembly performance difference for seam carving. Aimed at technical peers encountering this as a shared link or portfolio piece.

Secondary goal: a lightweight tutorial — prose-only explainer panels that walk a reader through the seam-carving algorithm at a conceptual level. Deliberately simple so Phase 3's step-through visualizer can replace it without throwaway work.

## Scope

### In scope

- New stacked single-column layout with academic-manuscript aesthetic
- Parallel dual-engine execution (both engines run concurrently on one Carve click)
- Per-engine elapsed timing panel with speedup ratio
- Bundled sample-image picker (using the existing `balloon.jpg` and `tower.jpg`)
- Original / Carved tab toggle on the canvas
- Four prose explainer panels below the fold
- Font loading (STIX Two Text from Google Fonts) and a neutral grey palette
- Removal of the Engine dropdown (parallel execution supersedes it)

### Out of scope

- Phase 3 step-through visualizer (live energy / cost / seam overlays)
- Phase 4 before/after slider comparison
- Drag-and-drop upload
- Vertical seam carving and content amplification
- Responsive polish for narrow viewports beyond "does not break"
- Per-engine live progress messages (workers still post a single result message; the main thread ticks its own elapsed counter)

## User flow

1. Page loads. Masthead shows "carver", tagline "seam carving · wasm vs typescript". Sample picker defaults to `balloon.jpg`; Width and Height inputs default to the image's native dimensions. Original/Carved tabs show with "Original" active.
2. **Carve stays disabled until `WASM_STATUS` arrives** (available or not). This avoids the current "optimistic wasm, fall back to ts" race where both workers might redundantly run TS if the user is very fast.
3. User adjusts Width and/or Height downward, optionally switches the Gradient dropdown (Sobel default), and clicks **Carve**.
4. Main thread creates **two independent buffer copies** of the source pixels (`postMessage` with a transferable list detaches the source `ArrayBuffer`, so one copy per worker is required). Copies are made via `new Uint8ClampedArray(imageData.data).buffer` per worker. One `RESIZE` message is dispatched to each worker — one engine-pinned to `ts`, one to `wasm`.
5. Both timing slots enter a live state: a spinner plus a ticking elapsed counter ("1.2s…"). The Carve button disables. The Carved tab becomes active and shows a placeholder.
6. WASM result arrives first (typically hundreds of ms). Its timing slot fills with the final elapsed time. The carved image renders into the canvas under the active Carved tab.
7. TS result arrives 4–10s later. Its timing slot fills. The speedup multiplier cell fills. Carve button re-enables.
8. User toggles the Original / Carved tab to compare. Clicks Carve again with different params, or Download to save the carved PNG.

**WASM unavailable.** Current behavior preserved: worker posts `WASM_STATUS {available: false}` on init failure, the WASM slot shows "unavailable" and that engine does not run; the TS worker runs normally. No change to the existing `WasmStatus` message.

**Which engine's carved output is displayed.** Both engines produce identical pixels (enforced by `wasm-consistency.test.ts`), but to keep state deterministic we render **WASM's result if WASM succeeded, otherwise TS's**. A WASM result arrives first, so the canvas updates as soon as WASM finishes; the later-arriving TS result does not re-render.

## Architecture

```text
Main (App)
 ├─ wasmWorker ── runs WASM engine only (new worker instance)
 └─ tsWorker   ── runs TS engine only   (new worker instance)
```

Both workers share the same `carver.worker.ts` source — the engine pin is supplied per `RESIZE` request (the existing `engine` field already serves this). They are instantiated upfront during `App` mount so the first Carve click does not pay WASM init cost.

### Workers

- **No protocol changes.** Existing `RESIZE` request, `RESIZE` response, `RESIZE_ERROR`, `WASM_STATUS` stay as-is (see [src/types.ts:18-45](../../../src/types.ts#L18-L45)).
- Each Carve click creates two independent `ArrayBuffer` copies of the source pixels (see User flow step 4), so both workers receive their own transferable buffer.
- `dispatchResize()` is already engine-pinned by request; no change needed in [src/worker/dispatch.ts](../../../src/worker/dispatch.ts).

### Main-thread timing

- On Carve, main thread captures `performance.now()` and starts a `setInterval` (100 ms) per slot that updates a "1.4s" ticker in state.
- Each worker's `RESIZE` response already carries `elapsed` (the worker-measured wall time). That value — not the ticker's running total — is what's displayed as the *final* time, so the numbers match what we'd report in a benchmark.
- When both workers have responded (or errored), the speedup ratio is computed: `round(ts.elapsed / wasm.elapsed, 1) + "×"`.

### State shape

Extends the current `AppState`. Key additions:

```ts
interface EngineRunState {
  status: 'idle' | 'running' | 'done' | 'error' | 'unavailable';
  elapsedMs: number | null;    // final time from worker response
  tickerMs: number | null;     // main-thread live ticker, cleared on final
  errorMessage: string | null;
}

interface AppState {
  imageData: ImageData | null;        // source image
  carvedImageData: ImageData | null;  // result (WASM if available, else TS)
  activeTab: 'original' | 'carved';
  targetWidth: number;
  targetHeight: number;
  derivative: Derivative;
  sampleKey: 'balloon' | 'tower' | 'upload';
  wasmStatusKnown: boolean;           // true once WASM_STATUS has arrived
  wasmAvailable: boolean;
  runs: { wasm: EngineRunState; ts: EngineRunState };
}
```

The current `engine` field goes away.

## Components

Keep the existing component split (`App`, `Controls`, `Canvas`), modify in place, and add:

- **`Masthead`** — wordmark and tagline (small, static).
- **`SamplePicker`** — the combined sample dropdown + upload affordance that replaces the current `<input type="file">`. Emits either a bundled sample key or a user-uploaded `File`.
- **`TimingPanel`** — renders the three cards (WASM / TypeScript / speedup), one prop: `{ runs }`. Owns no logic besides formatting.
- **`Explainer`** — static prose component with four sub-sections (no state, no props).
- **`CanvasTabs`** — the Original / Carved tab header that sits above the existing `Canvas`. Swaps which `ImageData` the canvas receives.

Existing `Controls` is reworked to host `SamplePicker` + W/H + Gradient + Carve, and to remove the Engine dropdown. Existing `Canvas` is unchanged except that its parent now selects which `ImageData` to pass (original vs carved).

## Visual design

### Palette

- Canvas background: `#f5f5f4`
- Text primary: `#151515`
- Text muted / labels: `#767676`
- Body prose: `#2a2a2a`
- Card/input background: `#ffffff`
- Border / divider: `#e3e3e3`
- Carved-slot empty / inactive-tab: `#e5e5e4`
- Primary button / active tab / speedup badge: `#151515` (foreground `#f5f5f4`)

No chromatic accent. The speedup badge uses the same charcoal as the primary button.

### Typography

- **Display / headings / timing values:** STIX Two Text (Google Fonts), weights 400/500/600/700.
- **UI chrome (controls, tabs, timing labels, tagline):** system sans (`ui-sans-serif, system-ui, sans-serif`).
- **Wordmark and step headings:** lowercase (`carver`, `i. energy map`, `how seam carving works`).
- **Controls, buttons, tab labels:** Title Case (`Sample`, `Width`, `Carve`, `Original`, `Carved`).
- **Timing-panel labels:** structural uppercase (`WASM`, `TYPESCRIPT`, `FASTER`) — not controls, so they follow the same pattern as the other static labels (e.g. the tagline).
- **Numeric values** use `font-variant-numeric: tabular-nums` so the ticker doesn't jiggle.

### Layout

- Page max-width ~960 px (matches current).
- Stacked single-column: masthead → controls row → canvas tabs → canvas → timing panel → explainer.
- Controls row is horizontal with `flex-wrap` so it doesn't break awkwardly at narrow widths.
- 3 px radius on inputs and cards (`border-radius: 3px`), consistent with the restrained manuscript aesthetic.

## Tutorial content (final copy)

Below the fold, under a `how seam carving works` label:

**i. energy map** — Each pixel gets an energy value — roughly, how much it differs from its neighbors. High energy means an edge; low energy means smooth texture. The Sobel gradient makes this explicit.

**ii. cost matrix** — A dynamic-programming pass accumulates energy top-to-bottom: each cell stores the cheapest path from the top edge to itself. The bottom row now tells us the cost of every possible seam.

**iii. seam** — Starting from the cheapest cell in the bottom row, we walk back up the stored parent pointers. That trace is the lowest-energy seam — the pixels we can remove with the least visible damage.

**iv. remove and repeat** — We delete those pixels, shift the image one column narrower, and run the whole thing again. Hundreds of iterations later, we've shed a lot of width without stretching or cropping anything the eye cares about.

(Copy is final; review appreciated but further wordsmithing during implementation is fine.)

## Error and edge cases

- **WASM status not yet known.** Carve button disabled until `WASM_STATUS` has arrived (available or unavailable). Sample images still load and the Original tab renders while waiting.
- **WASM init fails.** WASM slot shows `Unavailable` in place of a time; that engine does not run on Carve; TS runs normally. The speedup cell hides (we don't have two numbers to divide). Current `WASM_STATUS` flow preserved.
- **Either worker throws** (`RESIZE_ERROR`). That slot shows `Error` with a short message; the other engine's result still renders. Main thread re-enables Carve once both workers have responded or errored.
- **Target dimensions equal source.** Carve button stays disabled (existing `isResizeDisabled` rule preserved).
- **Target dimensions exceed source.** Same — disabled (enlargement not supported).
- **User clicks Carve while a run is in flight.** Button is disabled during a run; not reachable. (If we later want cancel/restart semantics, that's a separate scope.)
- **Font load failure.** `font-display: swap` means users see Georgia fallback during load and never get FOIT. If the Google Fonts request is blocked entirely, Georgia remains permanently — the aesthetic degrades gracefully.

## Testing

- **Existing tests.** `carver.test.ts`, `dispatch.test.ts`, `wasm-consistency.test.ts` all stay green. Dispatch logic is unchanged, algorithm module untouched.
- **New unit tests.**
  - `App` state transitions: on Carve, both engine slots enter `running` with ticker ≥ 0; on each response, the corresponding slot moves to `done` with the worker-reported `elapsedMs`; speedup cell computes correctly.
  - WASM-unavailable branch: when `WASM_STATUS {available: false}` arrives, a subsequent Carve only fires on the TS worker and the WASM slot shows `Unavailable`.
  - Error branch: a `RESIZE_ERROR` from one worker moves only that slot to `error`; the other still completes.
  - Carve-disabled-before-status branch: while `wasmStatusKnown === false`, clicking Carve is not possible.
- **Manual UI checks** (not automated — see project CLAUDE.md note on UI verification):
  - Golden path: balloon sample, 400×300 target, Carve, both times appear, Carved tab shows a visibly-seam-carved result, Original tab still shows the source, Download works.
  - Tower sample, same.
  - Upload a user image of comparable size; same.
  - TS-only path (simulate by forcing WASM init to fail in a dev toggle or by blocking the WASM request).

## Migration notes

This is a redesign in place — same Vite + React app, same worker source, same algorithm. The change set is mostly in `src/components/` and `src/app.css`, plus a second worker instantiation in `App`. No package additions required (STIX Two Text loads via `<link>` in `index.html`).

Files expected to change:

- [src/components/App.tsx](../../../src/components/App.tsx) — dual worker instantiation, new state shape, timing ticker, result routing
- [src/components/Controls.tsx](../../../src/components/Controls.tsx) — removed Engine select, added SamplePicker usage, Title-Case labels
- [src/components/Canvas.tsx](../../../src/components/Canvas.tsx) — parent now chooses which ImageData to render; minor
- [src/app.css](../../../src/app.css) — full rewrite to match the new aesthetic
- [index.html](../../../index.html) — add Google Fonts link, set `<title>`
- New: `src/components/Masthead.tsx`, `src/components/SamplePicker.tsx`, `src/components/TimingPanel.tsx`, `src/components/CanvasTabs.tsx`, `src/components/Explainer.tsx`
- New: `public/samples/balloon.jpg`, `public/samples/tower.jpg` (move the existing repo-root `balloon.jpg` / `tower.jpg` into `public/samples/` so Vite serves them as static assets referenced by the SamplePicker)

Files unchanged:

- `src/algorithm/*`, `src/worker/carver.worker.ts`, `src/worker/dispatch.ts`, `src/types.ts`, `src/wasm/*`, `crates/*`
