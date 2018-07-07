import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setRgbUrl } from '../redux/image';

import Splash from '../components/Splash';

class SplashContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
    };
  }

  handleOpen() {
    this.setState({ showModal: true });
  }

  handleClose() {
    this.setState({ showModal: false });
  }
  handleSetClick(path) {
    fetch(path)
      .then((response) => {
        return response.blob();
      })
      .then((blob) => {
        this.handleFileChange(blob);
      });
  }

  handleFileChange(file) {
    const localImageUrl = window.URL.createObjectURL(file);
    this.props.setRgbUrl(localImageUrl);
  }

  render() {
    return (
      <Splash
        handleOpen={() => this.handleOpen()}
        handleClose={() => this.handleClose()}
        handleSetClick={(path) => this.handleSetClick(path)}
        handleFileChange={(file) => this.handleFileChange(file)}
        showModal={this.state.showModal}
      />
    );
  }
}

SplashContainer.propTypes = {
  setRgbUrl: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setRgbUrl }, dispatch);
}

export default connect(null, mapDispatchToProps)(SplashContainer);
