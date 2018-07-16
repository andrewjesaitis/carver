
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { selectDisplay, selectSeam, selectDerivative, setSize, setIsResizing } from '../redux/image';

import Controls from '../components/Controls';

class ControlsContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      width: undefined,
      height: undefined,
    };
  }

  componentWillReceiveProps({ width, height }) {
    this.setState({
      width,
      height,
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

  onWidthChange(evt) {
    this.setState({
      width: parseInt(evt.target.value, 10),
    });
  }

  onHeightChange(evt) {
    this.setState({
      height: parseInt(evt.target.value, 10),
    });
  }


  onResizeClick() {
    this.props.setIsResizing(true);
    this.props.setSize(this.state.width, this.state.height);
  }

  getWidthValidationState() {
    if (this.state.width < this.props.maxValidWidth) return 'success';
    else if (this.state.width > this.props.maxValidWidth ||
             this.state.width < 0) return 'error';
    return null;
  }

  getHeightValidationState() {
    if (this.state.height < this.props.maxValidHeight) return 'success';
    else if (this.state.height > this.props.maxValidHeight ||
             this.state.height < 0) return 'error';
    return null;
  }

  render() {
    return (
      <Controls
        display={this.props.display}
        seam={this.props.seam}
        derivative={this.props.derivative}
        width={this.state.width}
        height={this.state.height}
        isResizing={this.props.isResizing}
        onDisplayClick={(v) => this.onDisplayClick(v)}
        onSeamClick={(v) => this.onSeamClick(v)}
        onDerivativeClick={(v) => this.onDerivativeClick(v)}
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
  width: PropTypes.number,
  height: PropTypes.number,
  maxValidWidth: PropTypes.number,
  maxValidHeight: PropTypes.number,
  isResizing: PropTypes.bool.isRequired,
  selectDisplay: PropTypes.func.isRequired,
  selectSeam: PropTypes.func.isRequired,
  selectDerivative: PropTypes.func.isRequired,
  setSize: PropTypes.func.isRequired,
  setIsResizing: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    selectDisplay,
    selectSeam,
    selectDerivative,
    setSize,
    setIsResizing,
  }, dispatch);
}

function mapStateToProps({ image }) {
  return {
    display: image.get('display'),
    seam: image.get('seam'),
    derivative: image.get('derivative'),
    width: image.get('width'),
    height: image.get('height'),
    maxValidWidth: image.get('maxVaildWidth'),
    maxValidHeight: image.get('maxValidHeight'),
    isResizing: image.get('isResizing'),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ControlsContainer);
