
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import {
  selectDisplay, selectSeam, selectDerivative, selectRuntime,
  setSize, setIsResizing,
} from '../redux/image';

import Controls from '../components/Controls';

class ControlsContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      width: '',
      height: '',
      canResize: false,
    };
  }

  componentWillReceiveProps({ width, height, isResizing }) {
    this.setState({
      width: width.toString(),
      height: height.toString(),
      canResize: this.canResize(width, height, isResizing),
    });
  }

  onDisplayClick(v) {
    this.props.selectDisplay(v);
  }

  onSeamClick(v) {
    this.props.selectSeam(v);
  }

  onDerivativeClick(v) {
    this.props.selectDerivative(v);
  }

  onRuntimeClick(v) {
    this.props.selectRuntime(v);
  }

  onWidthChange(evt) {
    this.setState({
      width: evt.target.value,
      canResize: this.canResize(evt.target.value, this.state.height, this.state.isResizing),
    });
  }

  onHeightChange(evt) {
    this.setState({
      height: evt.target.value,
      canResize: this.canResize(this.state.width, evt.target.value, this.state.isResizing),
    });
  }

  onResizeClick() {
    this.props.setIsResizing(true);
    this.props.setSize(this.state.width, this.state.height);
  }

  getWidthValidationState(width = this.state.width) {
    const w = parseInt(width, 10);
    if (w < this.props.maxValidWidth) {
      return 'success';
    } else if ((this.props.maxValidWidth && w > this.props.maxValidWidth) ||
             w < 0) {
      return 'error';
    }
    return null;
  }

  getHeightValidationState(height = this.state.height) {
    const h = parseInt(height, 10);
    if (h < this.props.maxValidHeight) {
      return 'success';
    } else if ((this.props.maxValidHeight && h > this.props.maxValidHeight) ||
               h < 0) {
      return 'error';
    }
    return null;
  }

  canResize(width, height, isResizing) {
    const widthState = this.getWidthValidationState(width);
    const widthError = widthState === 'error';
    const heightState = this.getHeightValidationState(height);
    const heightError = heightState === 'error';
    const bothNull = heightState === null && widthState === null;
    // not (bad states)
    return !(isResizing || widthError || heightError || bothNull);
  }

  render() {
    return (
      <Controls
        display={this.props.display}
        seam={this.props.seam}
        derivative={this.props.derivative}
        runtime={this.props.runtime}
        width={this.state.width}
        height={this.state.height}
        canResize={this.state.canResize}
        onDisplayClick={(v) => this.onDisplayClick(v)}
        onSeamClick={(v) => this.onSeamClick(v)}
        onDerivativeClick={(v) => this.onDerivativeClick(v)}
        onRuntimeClick={(v) => this.onRuntimeClick(v)}
        onWidthChange={(evt) => this.onWidthChange(evt)}
        getWidthValidationState={() => this.getWidthValidationState()}
        onHeightChange={(evt) => this.onHeightChange(evt)}
        getHeightValidationState={() => this.getHeightValidationState()}
        onResizeClick={() => this.onResizeClick()}
      />
    );
  }
}

ControlsContainer.propTypes = {
  display: PropTypes.string.isRequired,
  seam: PropTypes.string.isRequired,
  derivative: PropTypes.string.isRequired,
  runtime: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  maxValidWidth: PropTypes.number,
  maxValidHeight: PropTypes.number,
  isResizing: PropTypes.bool.isRequired,
  selectDisplay: PropTypes.func.isRequired,
  selectSeam: PropTypes.func.isRequired,
  selectDerivative: PropTypes.func.isRequired,
  selectRuntime: PropTypes.func.isRequired,
  setSize: PropTypes.func.isRequired,
  setIsResizing: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    selectDisplay,
    selectSeam,
    selectDerivative,
    selectRuntime,
    setSize,
    setIsResizing,
  }, dispatch);
}

function mapStateToProps({ image }) {
  return {
    display: image.get('display'),
    seam: image.get('seam'),
    derivative: image.get('derivative'),
    runtime: image.get('runtime'),
    width: image.get('width'),
    height: image.get('height'),
    maxValidWidth: image.get('maxValidWidth'),
    maxValidHeight: image.get('maxValidHeight'),
    isResizing: image.get('isResizing'),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ControlsContainer);
