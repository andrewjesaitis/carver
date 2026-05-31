import type { KernelSample } from '../types';

interface Props {
  sample: KernelSample;
}

export default function KernelDetail({ sample }: Props) {
  const { pixels, gx, gy, magnitude, centerX, centerY } = sample;
  return (
    <div className="kernel-detail">
      <div className="kernel-detail-label">
        kernel at ({centerX}, {centerY})
      </div>
      <div className="kernel-grid">
        {pixels.map((v, i) => (
          <div
            key={i}
            className={`kernel-cell${i === 4 ? ' kernel-cell--center' : ''}`}
            style={{ background: `rgb(${v},${v},${v})`, color: v > 128 ? '#111' : '#eee' }}
          >
            {v}
          </div>
        ))}
      </div>
      <div className="kernel-stats">
        <span>Gx = {gx}</span>
        <span>Gy = {gy}</span>
        <strong>energy = {magnitude}</strong>
      </div>
    </div>
  );
}
