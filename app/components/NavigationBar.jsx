import React from 'react';
import PropTypes from 'prop-types';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';

function NavigationBar({ handleSetClick, handleFileChange }) {
  return (
    <Navbar>
      <Navbar.Header>
        <Navbar.Brand>
          <a href="/carver">carver</a>
        </Navbar.Brand>
      </Navbar.Header>
      <Nav pullRight>
        <NavItem eventKey={1} href="http://andrewjesaitis.com/2015/07/19/project-carver/">About</NavItem>
        <NavDropdown title="Load Image" id="basic-nav-dropdown">
          <MenuItem onClick={() => handleSetClick('images/tower.jpg')}>Tower</MenuItem>
          <MenuItem onClick={() => handleSetClick('images/ballon.jpg')}>Ballon</MenuItem>
          <MenuItem divider />
          <li className="upload-list-item">
            <label htmlFor="uploadInput">Your Image</label>
            <input
              id="uploadInput"
              type="file"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />
          </li>
        </NavDropdown>
      </Nav>
    </Navbar>
  );
}

NavigationBar.propTypes = {
  handleSetClick: PropTypes.func.isRequired,
  handleFileChange: PropTypes.func.isRequired,
};

export default NavigationBar;
