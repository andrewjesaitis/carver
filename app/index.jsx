import React from 'react';
import ReactDOM from 'react-dom';
import Immutable from 'immutable';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { image } from './redux/image';
import Main from './components/Main';

// require static assests so they are picked up by webpack
require('bootstrap/dist/css/bootstrap.css');
require('./images/ballon.jpg');
require('./images/tower.jpg');
require('./favicon.ico');

let middleware = [thunkMiddleware];

// Don't apply redux-logger in production
if (process.env.NODE_ENV !== 'production') {
  const loggerMiddleware = createLogger({
    stateTransformer: (state) => {
      const newState = {};
      for (const i of Object.keys(state)) {
        if (Immutable.Iterable.isIterable(state[i])) {
          newState[i] = state[i].toJS();
        } else {
          newState[i] = state[i];
        }
      }
      return newState;
    },
  });
  middleware = [...middleware, loggerMiddleware];
}

const store = createStore(
  combineReducers({
    image,
  }),
  applyMiddleware(...middleware)
);

ReactDOM.render(
  <Provider store={store}>
    <Main />
  </Provider>,
  document.getElementById('app')
);

