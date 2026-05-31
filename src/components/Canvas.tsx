import React, { useEffect } from 'react';

interface CanvasProps {
  imageData: ImageData | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  style?: React.CSSProperties;
}

/** Renders ImageData onto a canvas element. Blank until `imageData` is provided. */
export default function Canvas({ imageData, canvasRef, style }: CanvasProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData, canvasRef]);

  return <canvas ref={canvasRef} className="canvas" style={style} />;
}
