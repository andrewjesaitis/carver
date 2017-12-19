import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';

function Splash({ handleOpen, handleClose, handleSetClick, handleFileChange, showModal }) {
  return (
    <div className="jumbotron text-center">
      <h1>Load an image to get started</h1>
      <p>Seam carving is a technique to resize images without distorting content</p>
      <p><Button bsSize="large" bsStyle="primary" onClick={handleOpen}>Load Image</Button></p>
      <small>
        This demo is still in development.
        Seam insertion and forward energy calculation are not yet implemented.
      </small>
      <Modal show={showModal} onHide={handleClose} >
        <Modal.Header closeButton>
          <Modal.Title className="text-center">Load Image</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="list-unstyled text-center">
            <li><a onClick={() => handleSetClick('images/tower.jpg')}>Tower</a></li>
            <li><a onClick={() => handleSetClick('images/ballon.jpg')}>Ballon</a></li>
            <li role="separator" className="divider"></li>
            <li className="link-style">
              <label htmlFor="uploadInput">Your Image</label>
              <input
                id="uploadInput"
                type="file"
                onChange={(e) => handleFileChange(e.target.files)}
              />
            </li>
          </ul>
        </Modal.Body>
      </Modal>
    </div>
  );
}

Splash.propTypes = {
  handleOpen: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleSetClick: PropTypes.func.isRequired,
  handleFileChange: PropTypes.func.isRequired,
  showModal: PropTypes.bool.isRequired,
};

export default Splash;
