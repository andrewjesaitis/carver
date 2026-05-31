import type { CostDetailSample, CostDir } from '../types';

const ARROW: Record<CostDir, string> = {
  left: '↖',
  up: '↑',
  right: '↗',
};

const COST_DESC =
  'Scanning top to bottom, each pixel stores its own energy plus the smallest accumulated cost ' +
  'among the three pixels directly above it. By the bottom row, every cell holds the total cost ' +
  'of the cheapest seam ending there; the arrows point back to the parent that produced it. ' +
  'The marked cell is the lowest-cost endpoint — where the seam traceback begins.';

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
      <p className="detail-description">{COST_DESC}</p>
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
