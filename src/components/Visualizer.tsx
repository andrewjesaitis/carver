import { useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { VisualizerStage } from '../types';
import type { VizState } from './reducer';
import VisualizerCanvas from './VisualizerCanvas';
import StageInspector from './StageInspector';
import PlaybackControls from './PlaybackControls';

const STAGES: VisualizerStage[] = ['image', 'energy', 'cost', 'seam'];
const STAGE_LABELS: Record<VisualizerStage, string> = {
  image: 'i. image',
  energy: 'ii. energy',
  cost: 'iii. cost',
  seam: 'iv. seam',
};
const CAPTIONS: Record<VisualizerStage, string> = {
  image: 'The current image, before this seam is removed.',
  energy: 'High energy = edge. Low energy = smooth texture. The seam avoids high-energy pixels.',
  cost: 'Each cell stores the cheapest path from the top edge. The bottom row reveals where to start the seam.',
  seam: 'The lowest-cost path from top to bottom. These pixels are removed, shifting everything else one column inward.',
};

interface Props {
  viz: VizState;
  originalWidth: number;
  originalHeight: number;
  onStageChange: (stage: VisualizerStage) => void;
  onSeamChange: (seam: number) => void;
  onPlayToggle: () => void;
  onSpeedCycle: () => void;
}

export default function Visualizer({
  viz,
  originalWidth,
  originalHeight,
  onStageChange,
  onSeamChange,
  onPlayToggle,
  onSpeedCycle,
}: Props) {
  const stageIdx = STAGES.indexOf(viz.currentStage);

  const handleNext = useCallback(() => {
    if (stageIdx < 3) {
      onStageChange(STAGES[stageIdx + 1]);
    } else if (viz.currentSeam < viz.totalSeams - 1) {
      onSeamChange(viz.currentSeam + 1);
      onStageChange('image');
    } else {
      onPlayToggle(); // stop at end
    }
  }, [stageIdx, viz.currentSeam, viz.totalSeams, onStageChange, onSeamChange, onPlayToggle]);

  const handlePrev = useCallback(() => {
    if (stageIdx > 0) {
      onStageChange(STAGES[stageIdx - 1]);
    } else if (viz.currentSeam > 0) {
      onSeamChange(viz.currentSeam - 1);
      onStageChange('seam');
    }
  }, [stageIdx, viz.currentSeam, onStageChange, onSeamChange]);

  useEffect(() => {
    if (!viz.isPlaying) return;
    const ms = 1000 / viz.speed;
    const id = window.setInterval(handleNext, ms);
    return () => window.clearInterval(id);
  }, [viz.isPlaying, viz.speed, handleNext]);

  if (viz.status !== 'ready' || !viz.frame) {
    const message =
      viz.status === 'idle'
        ? 'Run a carve above to activate the visualizer.'
        : 'Computing visualizer…';
    return (
      <section className="visualizer">
        <div className="visualizer-label">how seam carving works</div>
        <p className="visualizer-placeholder">{message}</p>
      </section>
    );
  }

  const { frame, currentStage, currentSeam, totalSeams, isPlaying, speed } = viz;
  const activeImageData =
    currentStage === 'energy'
      ? frame.energyMap
      : currentStage === 'cost'
        ? frame.costHeatmap
        : frame.imageData;
  const showSeam = currentStage === 'seam';

  // Reserve the canvas area at the ORIGINAL image's aspect ratio so the box
  // height stays constant as the image is carved narrower/shorter. The current
  // frame renders at its fraction of the original, anchored top-left, so the
  // shrinking is visible without shifting the controls below on every frame.
  const canvasAreaStyle: CSSProperties = {
    width: '100%',
    maxWidth: `${originalWidth}px`,
    aspectRatio: `${originalWidth} / ${originalHeight}`,
  };
  const canvasStyle: CSSProperties = {
    width: `${(activeImageData.width / originalWidth) * 100}%`,
    height: `${(activeImageData.height / originalHeight) * 100}%`,
  };

  return (
    <section className="visualizer">
      <div className="visualizer-label">how seam carving works</div>
      <div className="visualizer-stage-tabs">
        {STAGES.map((s) => (
          <button
            key={s}
            className={`stage-tab${s === currentStage ? ' stage-tab--active' : ''}`}
            onClick={() => onStageChange(s)}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="visualizer-body">
        <div className="visualizer-canvas-wrap" style={canvasAreaStyle}>
          <VisualizerCanvas
            imageData={activeImageData}
            seamPath={showSeam ? frame.seamPath : undefined}
            style={canvasStyle}
          />
        </div>
      </div>
      <p className="visualizer-caption">{CAPTIONS[currentStage]}</p>
      <PlaybackControls
        currentSeam={currentSeam}
        currentStage={currentStage}
        totalSeams={totalSeams}
        isPlaying={isPlaying}
        speed={speed}
        onPrev={handlePrev}
        onNext={handleNext}
        onFirst={() => {
          onSeamChange(0);
          onStageChange('image');
        }}
        onLast={() => {
          onSeamChange(totalSeams - 1);
          onStageChange('seam');
        }}
        onPlayToggle={onPlayToggle}
        onSpeedCycle={onSpeedCycle}
      />
      <div className="visualizer-inspector">
        <StageInspector stage={currentStage} frame={frame} />
      </div>
    </section>
  );
}
