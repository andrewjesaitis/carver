import type { VisualizerStage, PlaybackSpeed } from '../types';

const STAGE_NUM: Record<VisualizerStage, number> = {
  image: 1,
  greyscale: 2,
  energy: 3,
  cost: 4,
  seam: 5,
};
const STAGE_COUNT = Object.keys(STAGE_NUM).length;

interface Props {
  currentSeam: number;
  currentStage: VisualizerStage;
  totalSeams: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onPlayToggle: () => void;
  onSpeedCycle: () => void;
}

export default function PlaybackControls({
  currentSeam,
  currentStage,
  totalSeams,
  isPlaying,
  speed,
  onPrev,
  onNext,
  onFirst,
  onLast,
  onPlayToggle,
  onSpeedCycle,
}: Props) {
  return (
    <div className="playback-controls">
      <div className="playback-nav">
        <button onClick={onFirst} aria-label="first seam" title="Jump to first seam">
          ⏮
        </button>
        <button onClick={onPrev} aria-label="previous" title="Previous stage">
          ←
        </button>
        <button
          onClick={onPlayToggle}
          aria-label={isPlaying ? 'pause' : 'play'}
          title={isPlaying ? 'Pause' : 'Play through every stage and seam'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={onNext} aria-label="next" title="Next stage">
          →
        </button>
        <button onClick={onLast} aria-label="last seam" title="Jump to last seam">
          ⏭
        </button>
      </div>
      <div className="playback-counter">
        stage {STAGE_NUM[currentStage]}/{STAGE_COUNT} · seam {currentSeam + 1}/{totalSeams}
      </div>
      <button
        className="playback-speed"
        onClick={onSpeedCycle}
        aria-label="cycle speed"
        title="Playback speed — click to cycle"
      >
        {speed}×
      </button>
    </div>
  );
}
