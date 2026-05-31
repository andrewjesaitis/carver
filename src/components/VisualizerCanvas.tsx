import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Seam } from '../types';

interface Props {
  imageData: ImageData;
  seamPath?: Seam;
  marker?: { x: number; y: number };
  style?: CSSProperties;
}

export default function VisualizerCanvas({ imageData, seamPath, marker, style }: Props) {
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

    if (marker) {
      // Reticle around the sampled pixel, sized relative to the image so it
      // reads at any scale. Double stroke (dark + bright) stays visible against
      // both light and dark regions of the energy map.
      const r = Math.max(5, Math.round(Math.min(imageData.width, imageData.height) * 0.04));
      const cx = marker.x + 0.5;
      const cy = marker.y + 0.5;
      ctx.lineWidth = Math.max(2, Math.round(r * 0.5));
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
      ctx.lineWidth = Math.max(1, Math.round(r * 0.28));
      ctx.strokeStyle = '#ffcc00';
      ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    }
  }, [imageData, seamPath, marker]);

  return <canvas ref={canvasRef} className="visualizer-canvas" style={style} />;
}
