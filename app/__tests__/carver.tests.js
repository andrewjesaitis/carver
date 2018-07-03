import { greyscale, simpleGradiant, sobelGradiant, computeCostMatrix, getBottomEdgeMin, getRightEdgeMin, computeSeam, traceSeam, ripSeam } from '../scripts/carver2';

// create tiny 4x4 test image; 64 element since each pixel is r,g,b,a
const testImgArr = new Uint8ClampedArray([238, 226, 86, 255, 255, 252, 96, 255, 255, 255, 109, 255, 255, 255, 117, 255, 84, 83, 58, 255, 131, 131, 80, 255, 151, 150, 76, 255, 196, 193, 68, 255, 73, 75, 77, 255, 68, 69, 76, 255, 41, 43, 55, 255, 30, 25, 17, 255, 28, 28, 26, 255, 28, 29, 25, 255, 0, 0, 17, 255, 159, 138, 26, 255]);
const testImgData = new ImageData(testImgArr, 4, 4);

test('covert image to grayscale', () => {
  const expectedGreyscaleImg = new ImageData(
      new Uint8ClampedArray([219, 219, 219, 255, 242, 242, 242, 255, 245, 245, 245, 255, 245, 245, 245, 255, 81, 81, 81, 255, 127, 127, 127, 255, 145, 145, 145, 255, 185, 185, 185, 255, 75, 75, 75, 255, 69, 69, 69, 255, 43, 43, 43, 255, 25, 25, 25, 255, 28, 28, 28, 255, 29, 29, 29, 255, 1, 1, 1, 255, 135, 135, 135, 255]), 4, 4);
  expect(greyscale(testImgData)).toEqual(expectedGreyscaleImg);
});

test('produce simple gradient image', () => {
    const expectedSimpleGradiantImg = new ImageData(
        new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 123, 123, 123, 255, 101, 101, 101, 255, 72, 72, 72, 255, 0, 0, 0, 255, 58, 58, 58, 255, 105, 105, 105, 255, 161, 161, 161, 255, 0, 0, 0, 255, 40, 40, 40, 255, 50, 50, 50, 255, 173, 173, 173, 255]), 4, 4);
    expect(simpleGradiant(testImgData)).toEqual(expectedSimpleGradiantImg);
});


test('produce sobel gradient image', () => {
    const expectedSobelGradiantImg = new ImageData(
        new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 190, 190, 190, 255, 32, 32, 32, 255, 252, 252, 252, 255, 35, 35, 35, 255, 137, 137, 137, 255, 186, 186, 186, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]), 4, 4);
    expect(sobelGradiant(testImgData)).toEqual(expectedSobelGradiantImg);
});

test('compute vertical energy', () => {
    const sobelGradiantImg = new ImageData(
        new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 190, 190, 190, 255, 32, 32, 32, 255, 252, 252, 252, 255, 35, 35, 35, 255, 137, 137, 137, 255, 186, 186, 186, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]), 4, 4);
    const expectedCostMatrix = [[{"current": {"cost": 0, "x": 0, "y": 0}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 1}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 35, "x": 0, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 35, "x": 0, "y": 3}, "minNeighbor": {"cost": 35, "x": 0, "y": 2}}], [{"current": {"cost": 0, "x": 1, "y": 0}, "minNeighbor": null}, {"current": {"cost": 190, "x": 1, "y": 1}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 137, "x": 1, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 35, "x": 1, "y": 3}, "minNeighbor": {"cost": 35, "x": 0, "y": 2}}], [{"current": {"cost": 0, "x": 2, "y": 0}, "minNeighbor": null}, {"current": {"cost": 32, "x": 2, "y": 1}, "minNeighbor": {"cost": 0, "x": 3, "y": 0}}, {"current": {"cost": 218, "x": 2, "y": 2}, "minNeighbor": {"cost": 32, "x": 2, "y": 1}}, {"current": {"cost": 32, "x": 2, "y": 3}, "minNeighbor": {"cost": 32, "x": 3, "y": 2}}], [{"current": {"cost": 0, "x": 3, "y": 0}, "minNeighbor": null}, {"current": {"cost": 252, "x": 3, "y": 1}, "minNeighbor": {"cost": 0, "x": 3, "y": 0}}, {"current": {"cost": 32, "x": 3, "y": 2}, "minNeighbor": {"cost": 32, "x": 2, "y": 1}}, {"current": {"cost": 32, "x": 3, "y": 3}, "minNeighbor": {"cost": 32, "x": 3, "y": 2}}]];
    expect(computeCostMatrix(sobelGradiantImg, 'vertical')).toEqual(expectedCostMatrix);
});

test('compute horizontal energy', () => {
    const sobelGradiantImg = new ImageData(
        new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 190, 190, 190, 255, 32, 32, 32, 255, 252, 252, 252, 255, 35, 35, 35, 255, 137, 137, 137, 255, 186, 186, 186, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]), 4, 4);
    const expectedCostMatrix =  [[{"current": {"cost": 0, "x": 0, "y": 0}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 1}, "minNeighbor": null}, {"current": {"cost": 35, "x": 0, "y": 2}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 3}, "minNeighbor": null}], [{"current": {"cost": 0, "x": 1, "y": 0}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 190, "x": 1, "y": 1}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 137, "x": 1, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 3}}, {"current": {"cost": 0, "x": 1, "y": 3}, "minNeighbor": {"cost": 0, "x": 0, "y": 3}}], [{"current": {"cost": 0, "x": 2, "y": 0}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 32, "x": 2, "y": 1}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 186, "x": 2, "y": 2}, "minNeighbor": {"cost": 0, "x": 1, "y": 3}}, {"current": {"cost": 0, "x": 2, "y": 3}, "minNeighbor": {"cost": 0, "x": 1, "y": 3}}], [{"current": {"cost": 0, "x": 3, "y": 0}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 252, "x": 3, "y": 1}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 0, "x": 3, "y": 2}, "minNeighbor": {"cost": 0, "x": 2, "y": 3}}, {"current": {"cost": 0, "x": 3, "y": 3}, "minNeighbor": {"cost": 0, "x": 2, "y": 3}}]];
    expect(computeCostMatrix(sobelGradiantImg, 'horizontal')).toEqual(expectedCostMatrix);
});

test('min bottom edge', () => {
    const costMatrix = [
        [{"current": {"cost": 0, "x": 0, "y": 0}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 1}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 35, "x": 0, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 35, "x": 0, "y": 3}, "minNeighbor": {"cost": 35, "x": 0, "y": 2}}],
        [{"current": {"cost": 0, "x": 1, "y": 0}, "minNeighbor": null}, {"current": {"cost": 190, "x": 1, "y": 1}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 137, "x": 1, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 35, "x": 1, "y": 3}, "minNeighbor": {"cost": 35, "x": 0, "y": 2}}],
        [{"current": {"cost": 0, "x": 2, "y": 0}, "minNeighbor": null}, {"current": {"cost": 32, "x": 2, "y": 1}, "minNeighbor": {"cost": 0, "x": 3, "y": 0}}, {"current": {"cost": 218, "x": 2, "y": 2}, "minNeighbor": {"cost": 32, "x": 2, "y": 1}}, {"current": {"cost": 32, "x": 2, "y": 3}, "minNeighbor": {"cost": 32, "x": 3, "y": 2}}],
        [{"current": {"cost": 0, "x": 3, "y": 0}, "minNeighbor": null}, {"current": {"cost": 252, "x": 3, "y": 1}, "minNeighbor": {"cost": 0, "x": 3, "y": 0}}, {"current": {"cost": 32, "x": 3, "y": 2}, "minNeighbor": {"cost": 32, "x": 2, "y": 1}}, {"current": {"cost": 32, "x": 3, "y": 3}, "minNeighbor": {"cost": 32, "x": 3, "y": 2}}]];
    expect(getBottomEdgeMin(costMatrix)).toEqual({"current": {"cost": 32, "x": 3, "y": 3}, "minNeighbor": {"cost": 32, "x": 3, "y": 2}});
});

test('min right edge', () => {
    const costMatrix = [
        [{"current": {"cost": 0, "x": 0, "y": 0}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 1}, "minNeighbor": null}, {"current": {"cost": 35, "x": 0, "y": 2}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 3}, "minNeighbor": null}],
        [{"current": {"cost": 0, "x": 1, "y": 0}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 190, "x": 1, "y": 1}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 137, "x": 1, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 3}}, {"current": {"cost": 0, "x": 1, "y": 3}, "minNeighbor": {"cost": 0, "x": 0, "y": 3}}],
        [{"current": {"cost": 0, "x": 2, "y": 0}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 32, "x": 2, "y": 1}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 186, "x": 2, "y": 2}, "minNeighbor": {"cost": 0, "x": 1, "y": 3}}, {"current": {"cost": 0, "x": 2, "y": 3}, "minNeighbor": {"cost": 0, "x": 1, "y": 3}}],
        [{"current": {"cost": 0, "x": 3, "y": 0}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 252, "x": 3, "y": 1}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 0, "x": 3, "y": 2}, "minNeighbor": {"cost": 0, "x": 2, "y": 3}}, {"current": {"cost": 0, "x": 3, "y": 3}, "minNeighbor": {"cost": 0, "x": 2, "y": 3}}]];
    expect(getRightEdgeMin(costMatrix)).toEqual({"current": {"cost": 0, "x": 3, "y": 3}, "minNeighbor": {"cost": 0, "x": 2, "y": 3}});
});

test('compute vertical seam', () => {
  const costMatrix = [
        [{"current": {"cost": 0, "x": 0, "y": 0}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 1}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 35, "x": 0, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 35, "x": 0, "y": 3}, "minNeighbor": {"cost": 35, "x": 0, "y": 2}}],
        [{"current": {"cost": 0, "x": 1, "y": 0}, "minNeighbor": null}, {"current": {"cost": 190, "x": 1, "y": 1}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 137, "x": 1, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 35, "x": 1, "y": 3}, "minNeighbor": {"cost": 35, "x": 0, "y": 2}}],
        [{"current": {"cost": 0, "x": 2, "y": 0}, "minNeighbor": null}, {"current": {"cost": 32, "x": 2, "y": 1}, "minNeighbor": {"cost": 0, "x": 3, "y": 0}}, {"current": {"cost": 218, "x": 2, "y": 2}, "minNeighbor": {"cost": 32, "x": 2, "y": 1}}, {"current": {"cost": 32, "x": 2, "y": 3}, "minNeighbor": {"cost": 32, "x": 3, "y": 2}}],
        [{"current": {"cost": 0, "x": 3, "y": 0}, "minNeighbor": null}, {"current": {"cost": 252, "x": 3, "y": 1}, "minNeighbor": {"cost": 0, "x": 3, "y": 0}}, {"current": {"cost": 32, "x": 3, "y": 2}, "minNeighbor": {"cost": 32, "x": 2, "y": 1}}, {"current": {"cost": 32, "x": 3, "y": 3}, "minNeighbor": {"cost": 32, "x": 3, "y": 2}}]];
  expect(computeSeam('vertical', costMatrix)).toEqual([{"x": 3, "y": 3},{"x": 3, "y": 2},{"x": 2, "y": 1},{"x": 3, "y": 0}]);
});

test('compute horizontal seam', () => {
  const costMatrix = [
        [{"current": {"cost": 0, "x": 0, "y": 0}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 1}, "minNeighbor": null}, {"current": {"cost": 35, "x": 0, "y": 2}, "minNeighbor": null}, {"current": {"cost": 0, "x": 0, "y": 3}, "minNeighbor": null}],
        [{"current": {"cost": 0, "x": 1, "y": 0}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 190, "x": 1, "y": 1}, "minNeighbor": {"cost": 0, "x": 0, "y": 1}}, {"current": {"cost": 137, "x": 1, "y": 2}, "minNeighbor": {"cost": 0, "x": 0, "y": 3}}, {"current": {"cost": 0, "x": 1, "y": 3}, "minNeighbor": {"cost": 0, "x": 0, "y": 3}}],
        [{"current": {"cost": 0, "x": 2, "y": 0}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 32, "x": 2, "y": 1}, "minNeighbor": {"cost": 0, "x": 1, "y": 0}}, {"current": {"cost": 186, "x": 2, "y": 2}, "minNeighbor": {"cost": 0, "x": 1, "y": 3}}, {"current": {"cost": 0, "x": 2, "y": 3}, "minNeighbor": {"cost": 0, "x": 1, "y": 3}}],
        [{"current": {"cost": 0, "x": 3, "y": 0}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 252, "x": 3, "y": 1}, "minNeighbor": {"cost": 0, "x": 2, "y": 0}}, {"current": {"cost": 0, "x": 3, "y": 2}, "minNeighbor": {"cost": 0, "x": 2, "y": 3}}, {"current": {"cost": 0, "x": 3, "y": 3}, "minNeighbor": {"cost": 0, "x": 2, "y": 3}}]];
  expect(computeSeam('horizontal', costMatrix)).toEqual([{"x": 3, "y": 3}, {"x": 2, "y": 3}, {"x": 1, "y": 3}, {"x": 0, "y": 3}]);
});

test('trace vertical seam', () => {
  const vertSeam = [{"x": 2, "y": 3},{"x": 3, "y": 2},{"x": 2, "y": 1},{"x": 3, "y": 0}];
  const imgWithSeam = new ImageData(
    new Uint8ClampedArray([
      // y = 0
      238, 226, 86,  255,
      255, 252, 96,  255,
      255, 255, 109, 255,
      255, 0,   0,   255,
      // y = 1
      84,  83,  58,  255,
      131, 131, 80,  255,
      255, 0,   0,   255,
      196, 193, 68,  255,
      // y = 2
      73,  75,  77,  255,
      68,  69,  76,  255,
      41,  43,  55,  255,
      255, 0,   0,   255,
      // y = 3
      28,  28,  26,  255,
      28,  29,  25,  255,
      255, 0,   0,   255,
      159, 138, 26,  255
    ]), 4, 4);
  expect(traceSeam(vertSeam, testImgData)).toEqual(imgWithSeam);
});

test('trace horizontal seam', () => {
  const horzSeam = [{"x": 3, "y": 0}, {"x": 2, "y": 0}, {"x": 1, "y": 0}, {"x": 0, "y": 1}];
  const imgWithSeam = new ImageData(
    new Uint8ClampedArray([
      // y = 0
      238, 226, 86, 255,
      255, 0,   0,  255,
      255, 0,   0,  255,
      255, 0,   0,  255,
      // y = 1
      255, 0,   0,  255,
      131, 131, 80, 255,
      151, 150, 76, 255,
      196, 193, 68, 255,
      // y = 2
      73,  75,  77, 255,
      68,  69,  76, 255,
      41,  43,  55, 255,
      30,  25,  17, 255,
      // y = 3
      28,  28,  26, 255,
      28,  29,  25, 255,
      0,   0,   17, 255,
      159, 138, 26, 255
    ]), 4, 4);
  expect(traceSeam(horzSeam, testImgData)).toEqual(imgWithSeam);
});

test('rip vertical seam', () => {
  const vertSeam = [{"x": 2, "y": 3},{"x": 3, "y": 2},{"x": 2, "y": 1},{"x": 3, "y": 0}];
  const imgWithoutSeam = new ImageData(
    new Uint8ClampedArray([
      // y = 0
      238, 226, 86,  255,
      255, 252, 96,  255,
      255, 255, 109, 255,
      // 255, 0,   0,   255,
      // y = 1
      84,  83,  58,  255,
      131, 131, 80,  255,
      // 255, 0,   0,   255,
      196, 193, 68,  255,
      // y = 2
      73,  75,  77,  255,
      68,  69,  76,  255,
      41,  43,  55,  255,
      // 255, 0,   0,   255,
      // y = 3
      28,  28,  26,  255,
      28,  29,  25,  255,
      // 255, 0,   0,   255,
      159, 138, 26,  255
    ]), 3, 4);
  expect(ripSeam(vertSeam, 'vertical', testImgData)).toEqual(imgWithoutSeam);
});

test('rip horizontal seam', () => {
const horzSeam = [{"x": 3, "y": 0}, {"x": 2, "y": 0}, {"x": 1, "y": 0}, {"x": 0, "y": 1}];
  const imgWithoutSeam = new ImageData(
    new Uint8ClampedArray([
      // y = 0
      238, 226, 86, 255,
      // 255, 0,   0,  255,
      // 255, 0,   0,  255,
      // 255, 0,   0,  255,
      // y = 1
      // 255, 0,   0,  255,
      131, 131, 80, 255,
      151, 150, 76, 255,
      196, 193, 68, 255,
      // y = 2
      73,  75,  77, 255,
      68,  69,  76, 255,
      41,  43,  55, 255,
      30,  25,  17, 255,
      // y = 3
      28,  28,  26, 255,
      28,  29,  25, 255,
      0,   0,   17, 255,
      159, 138, 26, 255
    ]), 4, 3);
  expect(ripSeam(horzSeam, 'horizontal', testImgData)).toEqual(imgWithoutSeam);
});
  

