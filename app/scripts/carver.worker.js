import 'babel-polyfill';
import registerWorker from 'webworker-promise/lib/register';
import { calculateDisplayImage, resize } from '../scripts/carver2';
import { calculateDisplayImageWASM } from '../scripts/carver_wasm_wrapper.js';


registerWorker(async (msg, emit) => {
  console.log("in worker");
  // expect msg.type to map to carver entry function
  // expect msg.params to be map to args for corresponding function
  switch (msg.type) {
    case 'CALCULATE_DISPLAY_IMAGE_JS':
      const dispImgData = calculateDisplayImage(
        msg.params.rgb_data, msg.params.display, 
        msg.params.derivative, msg.params.seam);
      return { dispImgData };
    case 'CALCULATE_DISPLAY_IMAGE_WASM':
      const dispImgDataWasm = calculateDisplayImageWASM(
        msg.params.rgb_data, msg.params.display, 
        msg.params.derivative, msg.params.seam);
      return {dispImgData: msg.params.rgb_data}; // early return noop
      return dispImgDataWasm.then(dispImgData => {
        return { dispImgDataWasm };
      });
    case 'RESIZE_JS':
      const resizedImgData =  resize(
        msg.params.rgb_data, msg.params.derivative,
        msg.params.width, msg.params.height);
      return { resizedImgData };
    case 'RESIZE_WASM':
      const resizedImgDataWasm = msg.params.rgb_data;
      return { resizedImgData: resizedImgDataWasm };
    default:
      throw new Error('Invalid message type');
  }
});

