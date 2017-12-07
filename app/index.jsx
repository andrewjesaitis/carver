import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import Main from './components/Main';

let middleware = [thunkMiddleware];

// Don't apply redux-logger in production
if (process.env.NODE_ENV !== 'production') {
  const loggerMiddleware = createLogger();
  middleware = [...middleware, loggerMiddleware];
}

function simpleReducer(state = {}, action) {
  switch (action.type) {
    default:
      return state;
  }
}

const store = createStore(
  combineReducers({
    simpleReducer,
  }),
  applyMiddleware(...middleware)
);

ReactDOM.render(
  <Provider store={store}>
    <Main />
  </Provider>,
  document.getElementById('app')
);

