import Immutable from 'immutable';

const SET_FILE_URL = 'SET_FILE_URL';
const SET_RGB_DATA = 'SET_RGB_DATA';
const SET_DISPLAY_DATA = 'SET_DISPLAY_DATA';
const SELECT_DISPLAY = 'SELECT_DISPLAY';
const SELECT_SEAM = 'SELECT_SEAM';
const SELECT_DERIVATIVE = 'SELECT_DERIVATIVE';
const SELECT_RUNTIME = 'SELECT_RUNTIME';
const SET_SIZE = 'SET_SIZE';
const IS_RESIZING = 'IS_RESIZING';

// Actions

function setFileUrl(file_url) {
  return {
    type: SET_FILE_URL,
    file_url,
  };
}

function setRgbData(rgb_data) {
  return {
    type: SET_RGB_DATA,
    rgb_data,
  };
}

function setDisplayData(display_data) {
  return {
    type: SET_DISPLAY_DATA,
    display_data,
  };
}

function selectDisplay(display) {
  return {
    type: SELECT_DISPLAY,
    display,
  };
}

function selectSeam(seam) {
  return {
    type: SELECT_SEAM,
    seam,
  };
}

function selectDerivative(derivative) {
  return {
    type: SELECT_DERIVATIVE,
    derivative,
  };
}

function selectRuntime(runtime) {
  return {
    type: SELECT_RUNTIME,
    runtime,
  };
}

function setSize(width, height) {
  return {
    type: SET_SIZE,
    width,
    height,
  };
}

function setIsResizing(isResizing) {
  return {
    type: IS_RESIZING,
    isResizing,
  };
}

// Reducer

const initialImageState = Immutable.Map({
  file_url: '',
  rgb_data: null,
  display_data: null,
  display: 'original',
  seam: 'none',
  derivative: 'simple',
  runtime: 'js',
  width: null,
  height: null,
  maxValidWidth: null,
  maxValidHeight: null,
  isResizing: false,
});

function image(state = initialImageState, action) {
  switch (action.type) {
    case SET_FILE_URL:
      return state.merge({
        file_url: action.file_url,
      });
    case SET_RGB_DATA:
      const currentDisplayData = state.get('display_data');
      return state.merge({
        display_data: currentDisplayData === null ? action.rgb_data : currentDisplayData,
        rgb_data: action.rgb_data,
      });
    case SET_DISPLAY_DATA:
      return state.merge({
        display_data: action.display_data,
      });
    case SELECT_DISPLAY:
      return state.merge({
        display: action.display,
      });
    case SELECT_SEAM:
      return state.merge({
        seam: action.seam,
      });
    case SELECT_DERIVATIVE:
      return state.merge({
        derivative: action.derivative,
      });
    case SELECT_RUNTIME:
      return state.merge({
        runtime: action.runtime,
      });
    case SET_SIZE:
      return state.merge({
        width: parseInt(action.width, 10),
        height: parseInt(action.height, 10),
        maxValidWidth: parseInt(action.width, 10),
        maxValidHeight: parseInt(action.height, 10),
      });
    case IS_RESIZING:
      return state.merge({
        isResizing: action.isResizing,
      });
    default:
      return state;
  }
}

export {
  image, setFileUrl, setRgbData, setDisplayData, selectDisplay,
  selectSeam, selectDerivative, selectRuntime, setSize, setIsResizing,
};
