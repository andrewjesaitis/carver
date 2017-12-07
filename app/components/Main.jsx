import React from 'react';
import * as styles from '../styles/styles';

function Navbar() {
  return (
    <nav className="navbar navbar-default">
      <div className="container-fluid">
        <div className="navbar-header">
          <button
            type="button"
            className="navbar-toggle collapsed"
            data-toggle="collapse"
            data-target="#navbar-collapse-1"
            aria-expanded="false"
          >
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
          </button>
          <a className="navbar-brand" href="/carver">
            carver
          </a>
        </div>
        <div className="collapse navbar-collapse" id="navbar-collapse-1">
          <ul className="nav navbar-nav navbar-right">
            <li className="dropdown">
              <ul className="dropdown-menu">
                <div className="col-xs-12">
                  Things...
                </div>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function Main() {
  return (
    <div className="main-container" style={styles.mainComponent}>
      <Navbar />
      <div className="jumbotron"><h1>Howdy!</h1></div>
    </div>
  );
}

export default Main;
