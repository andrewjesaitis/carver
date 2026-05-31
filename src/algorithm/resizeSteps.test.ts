import { describe, it, expect } from 'vitest';
import { resizeSteps, resize, ripSeam } from './carver';

function makeImage(w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i * 7) % 256;
    data[i + 1] = (i * 13) % 256;
    data[i + 2] = (i * 3) % 256;
    data[i + 3] = 255;
  }
  return new ImageData(data, w, h);
}

function clone(img: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
}

describe('resizeSteps', () => {
  it('yields one frame per seam removal', () => {
    const frames = [...resizeSteps(makeImage(10, 8), 'sobel', 7, 6)];
    expect(frames).toHaveLength(5); // 3 width + 2 height reductions
  });

  it('yields zero frames when already at target', () => {
    const frames = [...resizeSteps(makeImage(10, 8), 'sobel', 10, 8)];
    expect(frames).toHaveLength(0);
  });

  it('seam index increments sequentially', () => {
    const frames = [...resizeSteps(makeImage(8, 6), 'sobel', 6, 6)];
    frames.forEach((f, i) => expect(f.seam).toBe(i));
  });

  it('imageData width decreases by one per vertical step', () => {
    const frames = [...resizeSteps(makeImage(8, 6), 'simple', 6, 6)];
    expect(frames[0].imageData.width).toBe(8);
    expect(frames[1].imageData.width).toBe(7);
  });

  it('each frame has populated fields', () => {
    const [frame] = resizeSteps(makeImage(10, 8), 'sobel', 9, 8);
    expect(frame.imageData.width).toBe(10);
    expect(frame.energyMap.width).toBe(10);
    expect(frame.costHeatmap.width).toBe(10);
    expect(frame.seamPath.length).toBeGreaterThan(0);
    expect(frame.kernelSample.pixels).toHaveLength(9);
    expect(frame.costDetail.costs).toHaveLength(49); // 7×7
    expect(frame.costDetail.arrowDirs).toHaveLength(49);
  });

  it('produces the same final image as resize()', () => {
    const w = 10,
      h = 8,
      tw = 7,
      th = 6;
    const img = makeImage(w, h);

    // Reconstruct final image by applying each frame's seamPath to its imageData
    let finalImg: ImageData | undefined;
    for (const frame of resizeSteps(clone(img), 'sobel', tw, th)) {
      const orientation = frame.imageData.width > tw ? 'vertical' : 'horizontal';
      finalImg = ripSeam(frame.seamPath, orientation, frame.imageData);
    }

    const expected = resize(clone(img), 'sobel', tw, th);
    expect(finalImg!.width).toBe(expected.width);
    expect(finalImg!.height).toBe(expected.height);
    expect(Array.from(finalImg!.data)).toEqual(Array.from(expected.data));
  });
});
