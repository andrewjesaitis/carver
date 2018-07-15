import React from 'react';
import { Glyphicon } from 'react-bootstrap';

function Loading({ isResizing }) {
  console.log("Rendering Loading", isResizing);
  if (isResizing) {
    return (
      <div className="loading text-center">
        <div className="vcenter">
          <Glyphicon className="gi-5x gi-spin" glyph="refresh" />
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }
  return null;
}

export default Loading;

