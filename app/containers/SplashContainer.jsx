import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setPath } from '../redux/image';

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

  handleFileChange(files) {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      this.props.setPath(readerEvent.target.result);
    };
    reader.readAsDataURL(files[0]);
  }

  render() {
    return (
      <Splash
        handleOpen={() => this.handleOpen()}
        handleClose={() => this.handleClose()}
        handleSetClick={(path) => this.props.setPath(path)}
        handleFileChange={(files) => this.handleFileChange(files)}
        showModal={this.state.showModal}
      />
    );
  }
}

SplashContainer.propTypes = {
  setPath: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setPath }, dispatch);
}

export default connect(null, mapDispatchToProps)(SplashContainer);
