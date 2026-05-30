/** Loads an image URL into an `ImageData` via an offscreen canvas. */
export function urlToImageData(url: string): Promise<ImageData> {
  return loadFromUrl(url);
}

/** Loads a File (e.g. from an `<input type="file">`) into an `ImageData`. */
export function fileToImageData(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  return loadFromUrl(url).finally(() => URL.revokeObjectURL(url));
}

function loadFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
