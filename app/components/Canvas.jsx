import React from 'react';
import PropTypes from 'prop-types';

function Canvas({ setRef }) {
  return (
    <canvas className="center-block" ref={setRef} width={0} height={0} />
  );
}

Canvas.propTypes = {
  setRef: PropTypes.func.isRequired,
};

export default Canvas;
