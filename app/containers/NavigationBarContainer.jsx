import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { setPath } from '../redux/image';

import NavigationBar from '../components/NavigationBar';

class NavigationBarContainer extends Component {
  handleFileChange(files) {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      this.props.setPath(readerEvent.target.result);
    };
    reader.readAsDataURL(files[0]);
  }

  render() {
    return (
      <NavigationBar
        handleSetClick={(path) => this.props.setPath(path)}
        handleFileChange={(files) => this.handleFileChange(files)}
      />
    );
  }
}

NavigationBarContainer.propTypes = {
  setPath: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setPath }, dispatch);
}

export default connect(null, mapDispatchToProps)(NavigationBarContainer);
