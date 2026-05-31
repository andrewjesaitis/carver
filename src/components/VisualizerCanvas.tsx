import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Seam } from '../types';

interface Props {
  imageData: ImageData;
  seamPath?: Seam;
  style?: CSSProperties;
}

export default function VisualizerCanvas({ imageData, seamPath, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    if (seamPath && seamPath.length > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      seamPath.forEach(({ x, y }, i) => {
        if (i === 0) ctx.moveTo(x + 0.5, y + 0.5);
        else ctx.lineTo(x + 0.5, y + 0.5);
      });
      ctx.stroke();
    }
  }, [imageData, seamPath]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={style} />;
}
