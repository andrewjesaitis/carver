import Immutable from 'immutable';

const SET_RGB_URL = 'SET_RGB_URL';
const SET_DISPLAY_URL = 'SET_DISPLAY_URL';
const SELECT_DISPLAY = 'SELECT_DISPLAY';
const SELECT_SEAM = 'SELECT_SEAM';
const SELECT_DERIVATIVE = 'SELECT_DERIVATIVE';
const SET_SIZE = 'SET_SIZE';

// Actions

function setRgbUrl(rgb_url) {
  return {
    type: SET_RGB_URL,
    rgb_url,
  };
}

function setDisplayUrl(display_url) {
  return {
    type: SET_DISPLAY_URL,
    display_url,
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

function setSize(width, height) {
  return {
    type: SET_SIZE,
    width,
    height,
  };
}

// Reducer

const initialImageState = Immutable.Map({
  rgb_url: '',
  display_url: '',
  display: 'original',
  seam: 'none',
  derivative: 'simple',
  width: 0,
  height: 0,
});

function image(state = initialImageState, action) {
  switch (action.type) {
    case SET_RGB_URL:
      const currentDisplayUrl = state.get('display_url');
      return state.merge({
        display_url: currentDisplayUrl === '' ? action.rgb_url : currentDisplayUrl,
        rgb_url: action.rgb_url,
      });
    case SET_DISPLAY_URL:
      return state.merge({
        display_url: action.display_url,
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
    case SET_SIZE:
      return state.merge({
        width: action.width,
        height: action.height,
      });
    default:
      return state;
  }
}

export { image, setRgbUrl, setDisplayUrl, selectDisplay, selectSeam, selectDerivative, setSize };
