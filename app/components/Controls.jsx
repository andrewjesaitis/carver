import React from 'react';
import PropTypes from 'prop-types';
import {
  ToggleButtonGroup, ToggleButton, Button, FormGroup, InputGroup,
  Form, FormControl,
} from 'react-bootstrap';

function Controls({
  display, seam, derivative, width, height, isResizing,
  onDisplayClick, onSeamClick, onDerivativeClick, onWidthChange,
  onHeightChange, onResizeClick, getHeightValidationState,
  getWidthValidationState,
}) {
  return (
    <div className="row">
      <div className="col-md-10 col-md-offset-1 col-xs-12">
        <ToggleButtonGroup
          className="col-md-2 col-xs-12"
          type="radio"
          name="display"
          value={display}
          onChange={onDisplayClick}
        >
          <ToggleButton value="original">Original</ToggleButton>
          <ToggleButton value="gradiant">Gradiant</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          className="col-md-3 col-xs-12"
          type="radio"
          name="seams"
          value={seam}
          onChange={onSeamClick}
        >
          <ToggleButton value="none">None</ToggleButton>
          <ToggleButton value="vertical">Vertical</ToggleButton>
          <ToggleButton value="horizontal">Horizontal</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          className="col-md-2 col-xs-12"
          type="radio"
          name="derivative"
          value={derivative}
          onChange={onDerivativeClick}
        >
          <ToggleButton value="simple">Simple</ToggleButton>
          <ToggleButton value="sobel">Sobel</ToggleButton>
        </ToggleButtonGroup>
        <Form className="col-xs-12 col-md-5" inline>
          <div className="row">
            <FormGroup
              className="col-md-4"
              validationState={getHeightValidationState()}
            >
              <InputGroup>
                <InputGroup.Addon>
                  <span className="glyphicon glyphicon-resize-vertical" aria-hidden="true" />
                </InputGroup.Addon>
                <FormControl
                  type="number"
                  placeholder="Pixels"
                  value={height}
                  onChange={onHeightChange}
                />
              </InputGroup>
            </FormGroup>
            <FormGroup
              className="col-md-4"
              validationState={getWidthValidationState()}
            >
              <InputGroup>
                <InputGroup.Addon>
                  <span className="glyphicon glyphicon-resize-horizontal" aria-hidden="true" />
                </InputGroup.Addon>
                <FormControl
                  type="number"
                  placeholder="Pixels"
                  value={width}
                  onChange={onWidthChange}
                />
              </InputGroup>
            </FormGroup>
            <FormGroup className="col-md-4">
              <Button onClick={onResizeClick} disabled={isResizing}>Resize</Button>
            </FormGroup>
          </div>
        </Form>
      </div>
    </div>
  );
}

Controls.propTypes = {
  display: PropTypes.string.isRequired,
  seam: PropTypes.string.isRequired,
  derivative: PropTypes.string.isRequired,
  width: PropTypes.string,
  height: PropTypes.string,
  onDisplayClick: PropTypes.func.isRequired,
  onSeamClick: PropTypes.func.isRequired,
  onDerivativeClick: PropTypes.func.isRequired,
  onWidthChange: PropTypes.func.isRequired,
  onHeightChange: PropTypes.func.isRequired,
  onResizeClick: PropTypes.func.isRequired,
  isResizing: PropTypes.bool.isRequired,
  getHeightValidationState: PropTypes.func.isRequired,
  getWidthValidationState: PropTypes.func.isRequired,
};

export default Controls;
