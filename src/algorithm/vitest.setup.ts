/** Minimal ImageData polyfill for Node test environment. */
class ImageDataPolyfill {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
    } else {
      this.data = new Uint8ClampedArray(dataOrWidth);
      this.width = widthOrHeight;
      this.height = height ?? dataOrWidth.length / (widthOrHeight * 4);
    }
  }
}

(globalThis as unknown as Record<string, unknown>).ImageData = ImageDataPolyfill;
