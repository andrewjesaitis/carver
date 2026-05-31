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
      <div className="kernel-detail-body">
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
          <div className="kernel-stat">
            <span className="kernel-stat-value">Gx = {gx}</span>
            <span className="kernel-stat-desc">
              horizontal gradient — how fast brightness changes left → right
            </span>
          </div>
          <div className="kernel-stat">
            <span className="kernel-stat-value">Gy = {gy}</span>
            <span className="kernel-stat-desc">
              vertical gradient — how fast brightness changes top → bottom
            </span>
          </div>
          <div className="kernel-stat">
            <span className="kernel-stat-value">energy = {magnitude}</span>
            <span className="kernel-stat-desc">
              √(Gx² + Gy²) — how sharply this pixel stands out from its neighbors
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
