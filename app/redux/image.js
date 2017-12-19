import Immutable from 'immutable';

const SET_PATH = 'SET_PATH';
const SELECT_DISPLAY = 'SELECT_DISPLAY';
const SELECT_SEAM = 'SELECT_SEAM';
const SELECT_DERIVATIVE = 'SELECT_DERIVATIVE';
const SET_SIZE = 'SET_SIZE';

// Actions

function setPath(path) {
  return {
    type: SET_PATH,
    path,
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
  path: '',
  display: 'original',
  seam: 'none',
  derivative: 'simple',
  width: 0,
  height: 0,
});

function image(state = initialImageState, action) {
  switch (action.type) {
    case SET_PATH:
      return state.merge({
        path: action.path,
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

export { image, setPath, selectDisplay, selectSeam, selectDerivative, setSize };
