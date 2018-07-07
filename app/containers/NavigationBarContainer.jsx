import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setRgbUrl } from '../redux/image';

import NavigationBar from '../components/NavigationBar';

class NavigationBarContainer extends Component {

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
      <NavigationBar
        handleSetClick={(path) => this.handleSetClick(path)}
        handleFileChange={(file) => this.handleFileChange(file)}
      />
    );
  }
}

NavigationBarContainer.propTypes = {
  setRgbUrl: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setRgbUrl }, dispatch);
}

export default connect(null, mapDispatchToProps)(NavigationBarContainer);
