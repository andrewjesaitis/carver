function copyImageData(src) {
  const copy = new ImageData(src.width, src.height);
  copy.data.set(src.data);
  return copy;
}

function at(x, y, arrWidth, channels = 1) {
  return ((y * arrWidth) + x) * channels;
}

export function greyscale(imgData) {
  const imgDataCopy = copyImageData(imgData);
  for (let i = 0; i < imgDataCopy.data.length; i += 4) {
    const avg = (0.21 * imgDataCopy.data[i]) +
                (0.72 * imgDataCopy.data[i + 1]) +
                (0.07 * imgDataCopy.data[i + 2]);
    imgDataCopy.data[i] = avg; // red
    imgDataCopy.data[i + 1] = avg; // green
    imgDataCopy.data[i + 2] = avg; // blue
  }
  return imgDataCopy;
}

export function simpleGradiant(imgData) {
  // initialize our destination array and views on the array
  const buf = new ArrayBuffer(imgData.data.length);
  const view32 = new Uint32Array(buf);
  const view8 = new Uint8ClampedArray(buf);

  const w = imgData.width;
  const h = imgData.height;

  // number of channels (r, g, b, a)
  const c = 4;

  const gsImgData = greyscale(imgData);

  // alpha is 225 == 0xff in hex
  const alpha = 0xff;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // index into 1 channel 32bit array
      const idx_32 = at(x, y, w);

      // indicies into 4 channel 8 bit array
      const idx = at(x, y, w, c);
      const lidx = (x > 0 && y > 0) ? at(x-1, y, w, c) : idx;
      const uidx = (x > 0 && y > 0) ? at(x, y-1, w, c) : idx;

      const curPix = gsImgData.data[idx];
      const leftPix = gsImgData.data[lidx];
      const upPix = gsImgData.data[uidx];

      // simple gradiant is the root of the sum of squared differentials
      const dx = curPix - leftPix;
      const dy = curPix - upPix;
      // clamp to 0-255 by bitwise & 0xff which is just modulo 256
      const mag = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) & 0xff;

      view32[idx_32] = (alpha << 24) | (mag << 16) | (mag << 8) | mag;
    }
  }
  return new ImageData(view8, w, h);
}

export function sobelGradiant(imgData) {
  // initialize our destination array and views on the array
  const buf = new ArrayBuffer(imgData.data.length);
  const view32 = new Uint32Array(buf);
  const view8 = new Uint8ClampedArray(buf);

  const w = imgData.width;
  const h = imgData.height;

  // number of channels (r, g, b, a)
  const c = 4;

  const gsImgData = greyscale(imgData);

  // alpha is 225 == 0xff in hex
  const alpha = 0xff;

  const kernelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];

  const kernelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const dx = (
        (kernelX[0][0] * gsImgData.data[at(x - 1, y - 1, w, c)]) +
        (kernelX[0][1] * gsImgData.data[at(x, y - 1, w, c)]) +
        (kernelX[0][2] * gsImgData.data[at(x + 1, y - 1, w, c)]) +
        (kernelX[1][0] * gsImgData.data[at(x - 1, y, w, c)]) +
        (kernelX[1][1] * gsImgData.data[at(x, y, w, c)]) +
        (kernelX[1][2] * gsImgData.data[at(x + 1, y, w, c)]) +
        (kernelX[2][0] * gsImgData.data[at(x - 1, y + 1, w, c)]) +
        (kernelX[2][1] * gsImgData.data[at(x, y + 1, w, c)]) +
        (kernelX[2][2] * gsImgData.data[at(x + 1, y + 1, w, c)])
      );

      const dy = (
        (kernelY[0][0] * gsImgData.data[at(x - 1, y - 1, w, c)]) +
        (kernelY[0][1] * gsImgData.data[at(x, y - 1, w, c)]) +
        (kernelY[0][2] * gsImgData.data[at(x + 1, y - 1, w, c)]) +
        (kernelY[1][0] * gsImgData.data[at(x - 1, y, w, c)]) +
        (kernelY[1][1] * gsImgData.data[at(x, y, w, c)]) +
        (kernelY[1][2] * gsImgData.data[at(x + 1, y, w, c)]) +
        (kernelY[2][0] * gsImgData.data[at(x - 1, y + 1, w, c)]) +
        (kernelY[2][1] * gsImgData.data[at(x, y + 1, w, c)]) +
        (kernelY[2][2] * gsImgData.data[at(x + 1, y + 1, w, c)])
        );
      const mag = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) & 0xff;
      view32[at(x, y, w)] = (alpha << 24) | (mag << 16) | (mag << 8) | mag;
    }
  }

  return new ImageData(view8, w, h);
}

function getCost(x, y, costMatrix) {
  return { x, y, cost: costMatrix[x][y]['current']['cost'] };
}

function getMinNeighbor(x, y, orientation, costMatrix) {
  let neighbor1 = null;
  let neighbor2 = null;
  let neighbor3 = null;
  let neighbor = null;
  if (orientation === 'vertical') {
    if (y === 0) {
      return null;
    } else if (x === 0) {
      neighbor1 = getCost(x, y - 1, costMatrix);
      neighbor2 = getCost(x + 1, y - 1, costMatrix);
      neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
    } else if (x === costMatrix.length - 1) {
      neighbor1 = getCost(x - 1, y - 1, costMatrix);
      neighbor2 = getCost(x, y - 1, costMatrix);
      neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
    } else {
      neighbor1 = getCost(x - 1, y - 1, costMatrix);
      neighbor2 = getCost(x, y - 1, costMatrix);
      neighbor3 = getCost(x + 1, y - 1, costMatrix);
      neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
      neighbor = neighbor.cost < neighbor3.cost ? neighbor : neighbor3;
    }
  } else if (orientation === 'horizontal') {
    if (x === 0) {
      return null;
    } else if (y === 0) {
      neighbor1 = getCost(x - 1, y, costMatrix);
      neighbor2 = getCost(x - 1, y + 1, costMatrix);
      neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
    } else if (y === costMatrix[0].length - 1) {
      neighbor1 = getCost(x - 1, y - 1, costMatrix);
      neighbor2 = getCost(x - 1, y, costMatrix);
      neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
    } else {
      neighbor1 = getCost(x - 1, y - 1, costMatrix);
      neighbor2 = getCost(x - 1, y, costMatrix);
      neighbor3 = getCost(x - 1, y + 1, costMatrix);
      neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
      neighbor = neighbor.cost < neighbor3.cost ? neighbor : neighbor3;
    }
  }
  return neighbor;
}

function computeCost(x, y, orientation, gradData, costMatrix) {
  let cost = gradData.data[at(x, y, gradData.width, 4)];

  if ((y === 0 && orientation === 'vertical') ||
      (x === 0 && orientation === 'horizontal')) {
    return {
      current: { x, y, cost },
      minNeighbor: null,
    };
  }
  const minNeighbor = getMinNeighbor(x, y, orientation, costMatrix);
  cost += minNeighbor.cost;
  return {
    current: { x, y, cost },
    minNeighbor,
  };
}

export function computeCostMatrix(gradData, orientation) {
  // we compute a matrix describing the "cost" or energy and
  // the lowest cost neighbor for pixel x, y

  const w = gradData.width;
  const h = gradData.height;
  const costMatrix = [];

  // init the matrix
  for (let i = 0; i < w; ++i) {
    costMatrix[i] = [];
    for (let j = 0; j < h; ++j) {
      costMatrix[i][j] = {
        current: { x: i, y: j, cost: 255 },
        minNeighbor: null,
      };
    }
  }

  if (orientation === 'horizontal') {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        costMatrix[i][j] = computeCost(i, j, orientation, gradData, costMatrix);
      }
    }
  } else if (orientation === 'vertical') {
    for (let j = 0; j < w; j++) {
      for (let i = 0; i < h; i++) {
        costMatrix[i][j] = computeCost(i, j, orientation, gradData, costMatrix);
      }
    }
  }
  return costMatrix;
}

export function getBottomEdgeMin(costMatrix) {
  const lastRowIdx = costMatrix[0].length - 1;
  const lastRow = Array.from(costMatrix.map(col => col[lastRowIdx]));
  const minCost = lastRow.reduce((a, b) => (a.current.cost < b.current.cost ? a : b));
  return minCost;
}

export function getRightEdgeMin(costMatrix) {
  const lastColIdx = costMatrix.length - 1;
  const lastCol = Array.from(costMatrix[lastColIdx]);
  const minCost = lastCol.reduce((a, b) => (a.current.cost < b.current.cost ? a : b));
  return minCost;
}

export function computeSeam(orientation, costMatrix) {
  const minCost = orientation === 'vertical' ?
    getBottomEdgeMin(costMatrix) :
    getRightEdgeMin(costMatrix);
  // take that position and follow the min cost route back to the top
  let { x, y } = minCost.current;
  let pos = orientation === 'vertical' ? y : x;
  const seam = [];
  while (pos > 0) {
    seam.push({ x, y });
    const neighbor = costMatrix[x][y].minNeighbor;
    ({ x, y } = neighbor);
    pos -= 1;
  }
  seam.push({ x, y });
  return seam;
}

export function traceSeam(seam, imgData) {
  const imgDataCopy = copyImageData(imgData);
  const uInt32Data = new Uint32Array(imgDataCopy.data.buffer);
  const view8 = new Uint8ClampedArray(imgDataCopy.data.buffer);

  const w = imgData.width;
  const h = imgData.height;

  for (let j = 0; j < seam.length; j++) {
    const idx = at(seam[j].x, seam[j].y, w);
    uInt32Data[idx] = (0xff << 24) | (0 << 16) | (0 << 8) | (0xff);
  }
  return new ImageData(view8, w, h);
}

export function ripSeam(seam, orientation, imgData) {
  // set up 32bit view on src image
  const src32View = new Uint32Array(imgData.data.buffer);

  // calculate width and height of target
  const w = orientation === 'vertical' ? imgData.width - 1 : imgData.width;
  const h = orientation === 'horizontal' ? imgData.height - 1 : imgData.height;

  // set up target ArrayBuffer and views
  const tgtBuf = new ArrayBuffer(w * h * 4);
  const tgt32View = new Uint32Array(tgtBuf);
  const tgt8View = new Uint8ClampedArray(tgtBuf);
  let tgtIdx = 0;

  // convert x,y coordinates to 1-d coordinates in the src 32bit view
  const seamIdxs = seam.map(point => at(point.x, point.y, imgData.width));
  seamIdxs.sort((a, b) => a - b);

  // copy all pixels that aren't in the seam to the target
  for (let i = 0; i < src32View.length; i++) {
    if (seamIdxs[0] === i) {
      seamIdxs.shift();
    } else {
      tgt32View[tgtIdx] = src32View[i];
      tgtIdx += 1;
    }
  }
  return new ImageData(tgt8View, w, h);
}
