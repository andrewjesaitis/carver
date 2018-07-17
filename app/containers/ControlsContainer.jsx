
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
      width: '',
      height: '',
    };
  }

  componentWillReceiveProps({ width, height }) {
    this.setState({
      width: width.toString(),
      height: height.toString(),
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
      width: evt.target.value,
    });
  }

  onHeightChange(evt) {
    this.setState({
      height: evt.target.value,
    });
  }


  onResizeClick() {
    this.props.setIsResizing(true);
    this.props.setSize(this.state.width, this.state.height);
  }

  getWidthValidationState() {
    const w = parseInt(this.state.width, 10);
    if (w < this.props.maxValidWidth) {
      return 'success';
    } else if ((this.props.maxValidWidth && w > this.props.maxValidWidth) || 
             w < 0) {
      return 'error';
    }
    return null;
  }

  getHeightValidationState() {
    const h = parseInt(this.state.height, 10);
    if (h < this.props.maxValidHeight) {
      return 'success';
    } else if ((this.props.maxValidHeight && h > this.props.maxValidHeight) || 
               h < 0) {
      return 'error';
    }
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
    maxValidWidth: image.get('maxValidWidth'),
    maxValidHeight: image.get('maxValidHeight'),
    isResizing: image.get('isResizing'),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ControlsContainer);
