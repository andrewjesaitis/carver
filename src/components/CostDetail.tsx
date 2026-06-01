import type { CostDetailSample, CostDir } from '../types';

const ARROW: Record<CostDir, string> = {
  left: '↖',
  up: '↑',
  right: '↗',
};

const COST_DESC =
  'The cost image is built from the energy image in a single top-to-bottom pass. The first row ' +
  'is copied straight from the energy. Every pixel below adds its own energy E to the cheapest ' +
  'of the three cost cells directly above it:';

const COST_DESC_AFTER =
  'By the bottom row, each cell M holds the total energy of the cheapest seam ending there. The ' +
  'arrows point to the parent cell that won the min; the marked cell is the lowest-cost ' +
  'endpoint — where the seam traceback begins.';

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
      <div className="cost-formula">
        M(x, y) = E(x, y) + min( M(x−1, y−1), M(x, y−1), M(x+1, y−1) )
      </div>
      <p className="detail-description">{COST_DESC_AFTER}</p>
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
