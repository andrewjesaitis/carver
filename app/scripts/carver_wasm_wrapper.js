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
  const len = w * h;
  console.log("called calculateDisplayImage");
  wasm().then(mod => { 
    console.log("module loaded"); 
    console.log(mod.ccall('add', 'nummber', ['number', 'number'], [2,3]));
  });
}
