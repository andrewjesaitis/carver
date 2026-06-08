const GREYSCALE_DESC =
  'Seam carving cares about brightness, not color, so the first step collapses each pixel’s ' +
  'red, green and blue channels into a single luminance value. The channels are weighted by how ' +
  'sensitive the human eye is to each — green most, blue least — so the greyscale image matches ' +
  'perceived brightness. Every later step (energy, cost, seam) runs on this single-channel image.';

export default function GreyscaleDetail() {
  return (
    <div className="stage-detail">
      <p className="detail-description">{GREYSCALE_DESC}</p>
      <div className="detail-diagram-label">luminance weights</div>
      <div className="cost-formula">Y = 0.21·R + 0.72·G + 0.07·B</div>
    </div>
  );
}
