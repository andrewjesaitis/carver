import React, { useEffect } from 'react';

interface CanvasProps {
  imageData: ImageData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

/** Renders ImageData onto a canvas element. Hidden when no image is loaded. */
export default function Canvas({ imageData, canvasRef }: CanvasProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData, canvasRef]);

  return (
    <canvas ref={canvasRef} style={{ display: imageData ? 'block' : 'none', maxWidth: '100%' }} />
  );
}
