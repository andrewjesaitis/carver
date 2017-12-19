import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setSize } from '../redux/image';

import SplashContainer from '../containers/SplashContainer';
import Canvas from '../components/Canvas';

class CanvasContainer extends Component {
  constructor(props) {
    super(props);
    this.setRef = this.setRef.bind(this);
    this.state = {
      imgData: new Uint8ClampedArray(),
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.path !== nextProps.path) {
      this.loadImage(nextProps.path);
    }
    this.canvas.width = nextProps.width;
    this.canvas.height = nextProps.height;
  }

  setRef(c) {
    this.canvas = c;
    this.ctx = this.canvas.getContext('2d');
  }

  loadImage(path) {
    const image = new Image();
    image.src = path;
    image.onload = () => {
      this.props.setSize(image.width, image.height);
      this.ctx.drawImage(image, 0, 0);
      this.setState({
        imgData: this.ctx.getImageData(0, 0, this.props.width, this.props.height),
      });
    };
  }

  render() {
    return (
      <div className="col-md-10 col-md-offset-1 col-xs-12">
        {this.props.path === '' ?
          <SplashContainer /> : ''
        }
        <Canvas setRef={this.setRef} />
      </div>
    );
  }
}

CanvasContainer.propTypes = {
  path: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  setSize: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setSize }, dispatch);
}

function mapStateToProps({ image }) {
  return {
    path: image.get('path'),
    width: image.get('width'),
    height: image.get('height'),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasContainer);
