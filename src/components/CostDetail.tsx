import type { CostDetailSample, CostDir, Orientation } from '../types';

const ARROW: Record<CostDir, string> = {
  left: '↖',
  up: '↑',
  right: '↗',
};

// The recurrence and pass direction differ by seam orientation: vertical seams
// accumulate top-to-bottom from the three pixels above; horizontal seams
// accumulate left-to-right from the three pixels to the left.
const COPY: Record<Orientation, string> = {
  vertical:
    'a pixel is that pixel’s energy plus the cheapest seam ending at one of the three pixels ' +
    'directly above it. We build the cost image from the energy image in a single top-to-bottom ' +
    'pass, memoising each subproblem’s answer. The first row is copied straight from the energy; ' +
    'every pixel below follows the recurrence:',
  horizontal:
    'a pixel is that pixel’s energy plus the cheapest seam ending at one of the three pixels ' +
    'directly to its left. We build the cost image from the energy image in a single ' +
    'left-to-right pass, memoising each subproblem’s answer. The first column is copied straight ' +
    'from the energy; every pixel after follows the recurrence:',
};

const FORMULA: Record<Orientation, string> = {
  vertical: 'M(x, y) = E(x, y) + min( M(x−1, y−1), M(x, y−1), M(x+1, y−1) )',
  horizontal: 'M(x, y) = E(x, y) + min( M(x−1, y−1), M(x−1, y), M(x−1, y+1) )',
};

const AFTER: Record<Orientation, string> = {
  vertical:
    'Because each cell reuses the answers already computed for the row above, the whole table ' +
    'fills in one linear pass instead of re-exploring every possible seam. By the bottom row, ' +
    'each cell M holds the total energy of the cheapest seam ending there. The arrows point to ' +
    'the parent that won the min; the marked cell is the lowest-cost endpoint — where the seam ' +
    'traceback begins.',
  horizontal:
    'Because each cell reuses the answers already computed for the column to its left, the whole ' +
    'table fills in one linear pass instead of re-exploring every possible seam. By the last ' +
    'column, each cell M holds the total energy of the cheapest seam ending there. The arrows ' +
    'point to the parent that won the min; the marked cell is the lowest-cost endpoint — where ' +
    'the seam traceback begins.',
};

interface Props {
  detail: CostDetailSample;
}

export default function CostDetail({ detail }: Props) {
  const { costs, arrowDirs, gridWidth, minIndex, orientation } = detail;
  const maxCost = Math.max(...costs);
  const minCost = Math.min(...costs);
  const range = maxCost - minCost || 1;

  return (
    <div className="cost-detail">
      <p className="detail-description">
        Finding the lowest-energy seam is a dynamic-programming problem: the cheapest seam ending at{' '}
        {COPY[orientation]}
      </p>
      <div className="cost-formula">{FORMULA[orientation]}</div>
      <p className="detail-description">{AFTER[orientation]}</p>
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
