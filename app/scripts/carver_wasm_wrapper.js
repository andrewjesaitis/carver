require('../lib/carver_c.wasm');
const wasm = require('../lib/carver_c.js');

// strings are annoying to pass directly to wasm, so we define "enums"
const CarverEnum = {
  original: 0,
  gradiant: 1,
  none: 0,
  vertical: 1,
  horizontal: 2,
  simple: 0,
  sobel: 1,
};

export function calculateDisplayImageWASM(imageData, display, derivative, orientation) {
  const w = imageData.width;
  const h = imageData.height;
  const len = w * h * 4;
  console.log("called calculateDisplayImage");
  // ready property hack to deal with promise-like module
  // see: https://github.com/kripken/emscripten/issues/5820#issuecomment-385722568
  const imageDataPromise = wasm().ready.then(mod => {
    console.log("module loaded");
    const mem = mod._malloc(len);
    mod. HEAPU8.set(imageData.data, mem);
    mod._calculateDisplayImage(mem, 0, 0, 0, w, h);
    const dispImageData = new Uint8ClampedArray(mod.HEAPU8.subarray(mem, mem + len));
    mod._free(mem);
    return new ImageData(dispImageData, w, h);
  });
  return imageDataPromise;
}
