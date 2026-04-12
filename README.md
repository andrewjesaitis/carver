# carver

![Carver](https://raw.githubusercontent.com/andrewjesaitis/carver/master/towerSobelHorz.png "Carver")

Browser-based seam carving app. Two interchangeable engines — a TypeScript implementation and a Rust port compiled to WebAssembly — selectable at runtime.

## Stack

- Vite + React + TypeScript (strict)
- Rust crate at `crates/carver-wasm/` compiled to WASM via `wasm-bindgen`
- All image compute runs off the main thread in a Web Worker
- Vitest for the TS/parity test suite; `cargo test` for the Rust unit tests

## Prerequisites

- Node 18+ and `npm`
- `rustup` with the `wasm32-unknown-unknown` target:

  ```sh
  rustup target add wasm32-unknown-unknown
  ```

- `wasm-bindgen-cli`:

  ```sh
  cargo install wasm-bindgen-cli
  ```

## Installation

```sh
git clone https://github.com/andrewjesaitis/carver.git
cd carver
npm install
npm run dev
```

`npm run dev` and `npm test` both run `build:wasm` first, so the generated WASM artifacts in `src/wasm/pkg/` are always up to date.

## Scripts

- `npm run dev` — start the Vite dev server (rebuilds WASM first)
- `npm run build` — production bundle (rebuilds WASM first)
- `npm run build:wasm` — compile the Rust crate and run `wasm-bindgen` standalone
- `npm test` — run the Vitest suite (TS algorithm + cross-engine parity + worker dispatch)
- `npm run test:rust` — run the Rust unit tests
- `npm run lint` / `npm run fmt` — oxlint / oxfmt

## Engine toggle

The UI exposes an Engine dropdown (TypeScript / WASM). The app defaults to WASM when available and falls back to TS if the WASM module fails to load. A cross-engine parity test verifies byte-identical output between the two implementations.

## Images

Thanks to Garrett and Newton for their images.

- Tower — [Wikipedia: Broadway tower](https://en.wikipedia.org/wiki/Seam_carving#/media/File:Broadway_tower_edit.jpg)
- Ballon (Garrett Heath) — [Flickr](https://www.flickr.com/photos/garrettheath/10262324124)
