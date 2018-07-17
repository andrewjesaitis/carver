import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setSize, setDisplayData, setRgbData, setIsResizing } from '../redux/image';
import { calculateDisplayImage, resize } from '../scripts/carver2';

import SplashContainer from '../containers/SplashContainer';
import Canvas from '../components/Canvas';
import Loading from '../components/Loading';

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
    if ((this.props.display !== nextProps.display ||
         this.props.derivative !== nextProps.derivative ||
         this.props.seam !== nextProps.seam ||
         this.props.rgb_data !== nextProps.rgb_data) &&
         nextProps.rgb_data !== null) {
      this.updateDisplayedImage(nextProps);
    }
  }

  componentDidUpdate(prevProps) {
    if ((this.props.width !== prevProps.width ||
         this.props.height !== prevProps.height) &&
         this.props.isResizing &&
         this.props.rgb_data !== null) {
        this.resizeImage(this.props.rgb_data, this.props.derivative,
                         this.props.width, this.props.height);
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
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      this.state.ctx.drawImage(image, 0, 0);
      const imageData = this.state.ctx.getImageData(0, 0, this.props.width, this.props.height);
      this.props.setRgbData(imageData);
    };
  }

  updateDisplayedImage({ rgb_data, display, derivative, seam, width, height }) {
    console.log("in updateDisplayedImage");
    const dispImgData = calculateDisplayImage(rgb_data, display, derivative, seam);
    this.state.ctx.putImageData(dispImgData, 0, 0);
    this.props.setDisplayData(this.state.ctx.getImageData(0, 0, width, height));
  }

  resizeImage(rgb_data, derivative, width, height) {
    console.log("in resizeImage");
    const resizedImage = resize(rgb_data, derivative, width, height);
    this.props.setRgbData(resizedImage);
    this.canvas.width = width;
    this.canvas.height = height;
    this.props.setSize(resizedImage.width, resizedImage.height);
    this.props.setIsResizing(false);
  }

  render() {
    return (
      <div className="col-md-10 col-md-offset-1 col-xs-12">
        {this.props.file_url === '' ?
          <SplashContainer /> : ''
        }
        <Loading isResizing={this.props.isResizing} />
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
  width: PropTypes.number,
  height: PropTypes.number,
  isResizing: PropTypes.bool.isRequired,
  setSize: PropTypes.func.isRequired,
  setRgbData: PropTypes.func.isRequired,
  setDisplayData: PropTypes.func.isRequired,
  setIsResizing: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setDisplayData, setRgbData, setSize, setIsResizing }, dispatch);
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
    isResizing: image.get('isResizing'),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasContainer);
