import React from 'react';
import NavigationBarContainer from '../containers/NavigationBarContainer';
import ControlsContainer from '../containers/ControlsContainer';
import CanvasContainer from '../containers/CanvasContainer';
import Footer from '../components/Footer';
import '../styles/custom.css';

function Main() {
  return (
    <div className="main-container">
      <NavigationBarContainer />
      <ControlsContainer />
      <div className="row canvas-container">
        <CanvasContainer />
      </div>
      <Footer />
    </div>
  );
}

export default Main;
