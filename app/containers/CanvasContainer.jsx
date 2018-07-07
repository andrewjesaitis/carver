import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setSize } from '../redux/image';
import { greyscale, simpleGradiant, sobelGradiant } from '../scripts/carver2';

import SplashContainer from '../containers/SplashContainer';
import Canvas from '../components/Canvas';

class CanvasContainer extends Component {
  constructor(props) {
    super(props);
    this.setRef = this.setRef.bind(this);
    this.state = {
      ctx: null,
      imgData: new Uint8ClampedArray(),
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.display_url !== nextProps.display_url) {
      this.loadImage(nextProps.display_url);
    }
    if (nextProps.display === 'gradiant') {
      this.gs();
    }
    if (this.props.width !== nextProps.width) {
      this.canvas.width = nextProps.width;
    }
    if (this.props.height !== nextProps.height) {
      this.canvas.height = nextProps.height;
    }
  }

  setRef(c) {
    this.canvas = c;
    this.setState({ ctx: this.canvas.getContext('2d') });
  }

  loadImage(url) {
    const image = new Image();
    image.src = url;
    image.onload = () => {
      this.props.setSize(image.width, image.height);
      this.state.ctx.drawImage(image, 0, 0);
      console.log("loaded");
      this.setState({
        imgData: this.state.ctx.getImageData(0, 0, this.props.width, this.props.height),
      });
    };
  }

  gs() {
    const gsImgData = sobelGradiant(this.state.imgData);
    this.state.ctx.putImageData(gsImgData, 0, 0);
  }

  render() {
    return (
      <div className="col-md-10 col-md-offset-1 col-xs-12">
        {this.props.display_url === '' ?
          <SplashContainer /> : ''
        }
        <Canvas setRef={this.setRef} />
      </div>
    );
  }
}

CanvasContainer.propTypes = {
  display: PropTypes.string.isRequired,
  display_url: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  setSize: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setSize }, dispatch);
}

function mapStateToProps({ image }) {
  return {
    display: image.get('display'),
    display_url: image.get('display_url'),
    width: image.get('width'),
    height: image.get('height'),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasContainer);
