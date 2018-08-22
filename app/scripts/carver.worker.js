import 'babel-polyfill';
import registerWorker from 'webworker-promise/lib/register';
import { calculateDisplayImage, resize } from './carver2';
import { calculateDisplayImageWASM } from './carver_wasm_wrapper';


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
      const dispImgDataWasm = await calculateDisplayImageWASM(
        msg.params.rgb_data, msg.params.display,
        msg.params.derivative, msg.params.seam);
      return { dispImgData: dispImgDataWasm };
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
