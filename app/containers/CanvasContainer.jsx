import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setSize, setDisplayData, setRgbData } from '../redux/image';
import { calculateDisplayImage, resize } from '../scripts/carver2';

import SplashContainer from '../containers/SplashContainer';
import Canvas from '../components/Canvas';

class CanvasContainer extends Component {
  constructor(props) {
    super(props);
    this.setRef = this.setRef.bind(this);
    this.state = {
      ctx: null,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.file_url !== nextProps.file_url) {
      this.loadImage(nextProps.file_url);
    }
    if ((this.props.width !== nextProps.width ||
         this.props.height !== nextProps.height) &&
         this.props.rgb_data !== null) {
      this.resizeImage(nextProps);
    }
    if ((this.props.display !== nextProps.display ||
         this.props.derivative !== nextProps.derivative ||
         this.props.seam !== nextProps.seam) &&
         nextProps.rgb_data !== null) {
      this.updateDisplayedImage(nextProps);
    }
    if (this.props.width !== nextProps.width ||
        this.props.height !== nextProps.height) {
      this.resizeCanvas(nextProps.width, nextProps.height);
    }
  }

  setRef(c) {
    this.canvas = c;
    this.setState({ ctx: this.canvas.getContext('2d') });
  }

  loadImage(file_url) {
    const image = new Image();
    image.src = file_url;
    image.onload = () => {
      this.props.setSize(image.width, image.height);
      this.state.ctx.drawImage(image, 0, 0);
      const imageData = this.state.ctx.getImageData(0, 0, image.width, image.height);
      this.props.setRgbData(imageData);
    };
  }

  updateDisplayedImage({ rgb_data, display, derivative, seam, width, height }) {
    const dispImgData = calculateDisplayImage(rgb_data, display, derivative, seam);
    this.state.ctx.putImageData(dispImgData, 0, 0);
    this.props.setDisplayData(this.state.ctx.getImageData(0, 0, width, height));
  }

  resizeImage({ rgb_data, display, derivative, seam, width, height }) {
    const resizedImage = resize(rgb_data, derivative, width, height);
    this.props.setSize(resizedImage.width, resizedImage.height);
    this.props.setRgbData(resizedImage);
  }
 
  resizeCanvas(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render() {
    return (
      <div className="col-md-10 col-md-offset-1 col-xs-12">
        {this.props.file_url === '' ?
          <SplashContainer /> : ''
        }
        <Canvas setRef={this.setRef} />
      </div>
    );
  }
}

CanvasContainer.propTypes = {
  file_url: PropTypes.string.isRequired,
  display_data: PropTypes.object,
  rgb_data: PropTypes.object,
  display: PropTypes.string.isRequired,
  derivative: PropTypes.string.isRequired,
  seam: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  setSize: PropTypes.func.isRequired,
  setRgbData: PropTypes.func.isRequired,
  setDisplayData: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setDisplayData, setRgbData, setSize }, dispatch);
}

function mapStateToProps({ image }) {
  return {
    file_url: image.get('file_url'),
    display_data: image.get('display_data'),
    rgb_data: image.get('rgb_data'),
    display: image.get('display'),
    derivative: image.get('derivative'),
    seam: image.get('seam'),
    width: image.get('width'),
    height: image.get('height'),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasContainer);
