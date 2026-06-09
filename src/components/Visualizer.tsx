import { useEffect, useCallback, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { VisualizerStage } from '../types';
import type { VizState } from './reducer';
import VisualizerCanvas from './VisualizerCanvas';
import StageInspector from './StageInspector';
import PlaybackControls from './PlaybackControls';

const INTRO =
  'Seam carving resizes an image by removing the lines of pixels — seams — that disturb it the ' +
  'least. A seam is a connected path of pixels running edge to edge. The algorithm repeatedly ' +
  'finds and removes the lowest-energy seam until the image reaches its target dimensions, ' +
  'shrinking it without stretching or cropping the things your eye cares about. The steps below ' +
  'show one such removal.';

const STAGES: VisualizerStage[] = ['image', 'greyscale', 'energy', 'cost', 'seam'];
const STAGE_LABELS: Record<VisualizerStage, string> = {
  image: 'i. image',
  greyscale: 'ii. greyscale',
  energy: 'iii. energy',
  cost: 'iv. cost',
  seam: 'v. seam',
};
// Short one-liners shown above the controls (reserved height keeps the controls
// from shifting between stages). The fuller, derivative-specific explanation
// lives in the detail pane below the controls.
const CAPTIONS: Record<VisualizerStage, string> = {
  image: 'The current image at this step, before the next seam is removed.',
  greyscale: 'Colour collapsed to a single brightness (luminance) per pixel.',
  energy: 'Edge strength — how sharply each pixel differs from its neighbours.',
  cost: 'The cheapest cumulative path cost accumulated into every pixel.',
  seam: 'The lowest-energy seam — the pixels about to be removed.',
};
const STAGE_TOOLTIPS: Record<VisualizerStage, string> = {
  image: 'The source image at this step',
  greyscale: 'Luminance — the brightness the gradient is computed on',
  energy: 'Per-pixel edge strength from the gradient',
  cost: 'Cumulative cheapest-path cost from the opposite edge',
  seam: 'The lowest-energy seam about to be removed',
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
  const lastStageIdx = STAGES.length - 1;

  const handleNext = useCallback(() => {
    if (stageIdx < lastStageIdx) {
      onStageChange(STAGES[stageIdx + 1]);
    } else if (viz.currentSeam < viz.totalSeams - 1) {
      onSeamChange(viz.currentSeam + 1);
      onStageChange('image');
    } else if (viz.isPlaying) {
      // At the very end: stop playback. Guard on isPlaying so a manual step at
      // the end (when paused) doesn't accidentally start it.
      onPlayToggle();
    }
  }, [
    stageIdx,
    lastStageIdx,
    viz.currentSeam,
    viz.totalSeams,
    viz.isPlaying,
    onStageChange,
    onSeamChange,
    onPlayToggle,
  ]);

  const handlePrev = useCallback(() => {
    if (stageIdx > 0) {
      onStageChange(STAGES[stageIdx - 1]);
    } else if (viz.currentSeam > 0) {
      onSeamChange(viz.currentSeam - 1);
      onStageChange('seam');
    }
  }, [stageIdx, viz.currentSeam, onStageChange, onSeamChange]);

  const stageTabRefs = useRef<Array<HTMLButtonElement | null>>(STAGES.map(() => null));

  const handleStageKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowRight') {
        const nextIdx = (stageIdx + 1) % STAGES.length;
        onStageChange(STAGES[nextIdx]);
        stageTabRefs.current[nextIdx]?.focus();
      } else if (e.key === 'ArrowLeft') {
        const prevIdx = (stageIdx - 1 + STAGES.length) % STAGES.length;
        onStageChange(STAGES[prevIdx]);
        stageTabRefs.current[prevIdx]?.focus();
      }
    },
    [stageIdx, onStageChange],
  );

  useEffect(() => {
    if (!viz.isPlaying) return;
    const ms = 1000 / viz.speed;
    const id = window.setInterval(handleNext, ms);
    return () => window.clearInterval(id);
  }, [viz.isPlaying, viz.speed, handleNext]);

  if (viz.status !== 'ready' || !viz.frame) {
    const isError = viz.status === 'error';
    const message = isError
      ? (viz.errorMessage ?? 'The visualizer ran into an error.')
      : viz.status === 'idle'
        ? 'Run a carve above to activate the visualizer.'
        : 'Computing visualizer…';
    return (
      <section className="visualizer">
        <div className="visualizer-label">how seam carving works</div>
        <p className="visualizer-intro">{INTRO}</p>
        <p className="visualizer-placeholder" role={isError ? 'alert' : undefined}>
          {message}
        </p>
      </section>
    );
  }

  const { frame, currentStage, currentSeam, totalSeams, isPlaying, speed } = viz;
  const activeImageData =
    currentStage === 'greyscale'
      ? frame.greyscaleMap
      : currentStage === 'energy'
        ? frame.energyMap
        : currentStage === 'cost'
          ? frame.costHeatmap
          : frame.imageData;
  const showSeam = currentStage === 'seam';
  // Mark the cell each detail pane is sampled from so the grid below ties back
  // to a location on the canvas: the kernel midpoint on energy, and the
  // minimum-cost starting cell (where the seam begins, seamPath[0]) on cost.
  const marker =
    currentStage === 'energy'
      ? { x: frame.kernelSample.centerX, y: frame.kernelSample.centerY }
      : currentStage === 'cost' && frame.seamPath.length > 0
        ? { x: frame.seamPath[0].x, y: frame.seamPath[0].y }
        : undefined;

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
      <p className="visualizer-intro">{INTRO}</p>
      <div role="tablist" aria-label="Visualizer stage" className="visualizer-stage-tabs">
        {STAGES.map((s, i) => (
          <button
            key={s}
            ref={(el) => {
              stageTabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={s === currentStage}
            tabIndex={s === currentStage ? 0 : -1}
            className={`stage-tab${s === currentStage ? ' stage-tab--active' : ''}`}
            onClick={() => onStageChange(s)}
            onKeyDown={handleStageKeyDown}
            title={STAGE_TOOLTIPS[s]}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="visualizer-body">
        <div className="visualizer-canvas-col">
          <div className="visualizer-canvas-wrap" style={canvasAreaStyle}>
            <VisualizerCanvas
              imageData={activeImageData}
              seamPath={showSeam ? frame.seamPath : undefined}
              marker={marker}
              style={canvasStyle}
            />
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
        </div>
        <div className="visualizer-inspector">
          <StageInspector stage={currentStage} frame={frame} derivative={viz.derivative} />
        </div>
      </div>
    </section>
  );
}
