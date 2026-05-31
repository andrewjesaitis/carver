import type { CostDetailSample, CostDir } from '../types';

const ARROW: Record<CostDir, string> = {
  left: '↖',
  up: '↑',
  right: '↗',
};

interface Props {
  detail: CostDetailSample;
}

export default function CostDetail({ detail }: Props) {
  const { costs, arrowDirs, gridWidth, minIndex } = detail;
  const maxCost = Math.max(...costs);
  const minCost = Math.min(...costs);
  const range = maxCost - minCost || 1;

  return (
    <div className="cost-detail">
      <div className="cost-detail-label">cost matrix (seam edge)</div>
      <div className="cost-grid" style={{ gridTemplateColumns: `repeat(${gridWidth}, 1fr)` }}>
        {costs.map((cost, i) => {
          const intensity = (cost - minCost) / range;
          return (
            <div
              key={i}
              className={`cost-cell${i === minIndex ? ' cost-cell--min' : ''}`}
              style={{ opacity: 0.25 + 0.75 * intensity }}
            >
              <div className="cost-arrow">{ARROW[arrowDirs[i]]}</div>
              <div className="cost-value">{Math.round(cost)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
