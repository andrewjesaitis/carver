import 'babel-polyfill';
import registerWorker from 'webworker-promise/lib/register';
import { calculateDisplayImage, resize } from '../scripts/carver2';

registerWorker(async (msg, emit) => {
  // expect msg.type to map to carver entry function
  // expect msg.params to be map to args for corresponding function
  switch (msg.type) {
    case 'CALCULATE_DISPLAY_IMAGE':
      const dispImgData = calculateDisplayImage(
        msg.params.rgb_data, msg.params.display, 
        msg.params.derivative, msg.params.seam);
      return { dispImgData };
    case 'RESIZE':
      const resizedImgData =  resize(
        msg.params.rgb_data, msg.params.derivative,
        msg.params.width, msg.params.height);
      return { resizedImgData };
    default:
      throw new Error('Invalid message type');
  }
});

