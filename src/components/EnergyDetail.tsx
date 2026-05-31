import type { KernelSample, Derivative } from '../types';

const SIMPLE_DESC =
  'The energy of an image is how rapidly brightness changes at each pixel. Working on the ' +
  'greyscale image, we measure how much the highlighted pixel differs from its left neighbour ' +
  '(Δx) and its upper neighbour (Δy), then combine them as E = √(Δx² + Δy²). Clamped to 0–255, ' +
  'this builds a greyscale map whose brightest pixels trace the edges of objects in the scene.';

const SOBEL_DESC =
  'The energy of an image is how rapidly brightness changes at each pixel. Working on the ' +
  'greyscale image, the Sobel operator estimates the horizontal (Gx) and vertical (Gy) gradient ' +
  'with a weighted 3×3 kernel over all eight neighbours — nearer pixels count more, which ' +
  'suppresses noise. Combined as E = √(Gx² + Gy²) and clamped to 0–255, the brightest pixels ' +
  'trace the edges of objects in the scene.';

// Pixel positions in the row-major 3×3 sample.
const CENTER = 4;
const LEFT = 3;
const UP = 1;

interface Props {
  sample: KernelSample;
  derivative: Derivative;
}

function PixelGrid({ pixels }: { pixels: number[] }) {
  return (
    <div className="energy-grid">
      {pixels.map((v, i) => (
        <div
          key={i}
          className={`kernel-cell${i === CENTER ? ' kernel-cell--center' : ''}`}
          style={{ background: `rgb(${v},${v},${v})`, color: v > 128 ? '#111' : '#eee' }}
        >
          {v}
        </div>
      ))}
    </div>
  );
}

// 3×3 cells of 2.5rem with 2px gaps. Cell centre i = i * (40 + 2) + 20 (px),
// computed in rem so the SVG overlay tracks the grid at any root font size.
const CELL = 2.5; // rem
const GAP = 0.125; // rem (2px)
const center = (i: number) => i * (CELL + GAP) + CELL / 2;
const SPAN = 3 * CELL + 2 * GAP;

function SimpleDiagram({ sample }: { sample: KernelSample }) {
  const { pixels, gx, gy, magnitude } = sample;
  const c = center(1);
  const left = center(0);
  const up = center(0);
  return (
    <div className="energy-diagram">
      <div className="energy-grid-wrap" style={{ width: `${SPAN}rem`, height: `${SPAN}rem` }}>
        <PixelGrid pixels={pixels} />
        <svg className="energy-arrows" viewBox={`0 0 ${SPAN} ${SPAN}`} aria-hidden="true">
          <defs>
            <marker
              id="energy-arrowhead"
              markerUnits="userSpaceOnUse"
              markerWidth="0.5"
              markerHeight="0.5"
              refX="0.4"
              refY="0.25"
              orient="auto"
            >
              <path d="M0,0 L0.5,0.25 L0,0.5 Z" fill="#e6a800" />
            </marker>
          </defs>
          {/* Δx: centre → left neighbour */}
          <line
            x1={c}
            y1={c}
            x2={left + 0.45}
            y2={c}
            stroke="#e6a800"
            strokeWidth="0.12"
            markerEnd="url(#energy-arrowhead)"
          />
          <text x={(c + left) / 2} y={c - 0.3} fontSize={0.6} className="energy-arrow-label">
            Δx
          </text>
          {/* Δy: centre → upper neighbour */}
          <line
            x1={c}
            y1={c}
            x2={c}
            y2={up + 0.45}
            stroke="#e6a800"
            strokeWidth="0.12"
            markerEnd="url(#energy-arrowhead)"
          />
          <text x={c + 0.45} y={(c + up) / 2} fontSize={0.6} className="energy-arrow-label">
            Δy
          </text>
        </svg>
      </div>
      <div className="energy-stats">
        <div className="kernel-stat">
          <span className="kernel-stat-value">Δx = {gx}</span>
          <span className="kernel-stat-desc">centre − left neighbour</span>
        </div>
        <div className="kernel-stat">
          <span className="kernel-stat-value">Δy = {gy}</span>
          <span className="kernel-stat-desc">centre − upper neighbour</span>
        </div>
        <div className="energy-result">
          E = √(Δx² + Δy²) = <strong>{magnitude}</strong>
        </div>
      </div>
    </div>
  );
}

function SobelDiagram({ sample }: { sample: KernelSample }) {
  const { pixels, gx, gy, magnitude } = sample;
  return (
    <div className="energy-diagram">
      <PixelGrid pixels={pixels} />
      <div className="energy-stats">
        <div className="kernel-stat">
          <span className="kernel-stat-value">Gx = {gx}</span>
          <span className="kernel-stat-desc">weighted change left → right</span>
        </div>
        <div className="kernel-stat">
          <span className="kernel-stat-value">Gy = {gy}</span>
          <span className="kernel-stat-desc">weighted change top → bottom</span>
        </div>
        <div className="energy-result">
          E = √(Gx² + Gy²) = <strong>{magnitude}</strong>
        </div>
      </div>
    </div>
  );
}

export default function EnergyDetail({ sample, derivative }: Props) {
  const { centerX, centerY } = sample;
  return (
    <div className="energy-detail">
      <p className="detail-description">{derivative === 'simple' ? SIMPLE_DESC : SOBEL_DESC}</p>
      <div className="detail-diagram-label">
        kernel at ({centerX}, {centerY})
      </div>
      {derivative === 'simple' ? (
        <SimpleDiagram sample={sample} />
      ) : (
        <SobelDiagram sample={sample} />
      )}
    </div>
  );
}
