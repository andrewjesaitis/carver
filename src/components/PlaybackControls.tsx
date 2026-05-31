import type { VisualizerStage } from '../types';

const STAGE_NUM: Record<VisualizerStage, number> = {
  image: 1, energy: 2, cost: 3, seam: 4,
};

interface Props {
  currentSeam: number;
  currentStage: VisualizerStage;
  totalSeams: number;
  isPlaying: boolean;
  speed: 0.5 | 1 | 2 | 4;
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onPlayToggle: () => void;
  onSpeedCycle: () => void;
}

export default function PlaybackControls({
  currentSeam, currentStage, totalSeams,
  isPlaying, speed,
  onPrev, onNext, onFirst, onLast, onPlayToggle, onSpeedCycle,
}: Props) {
  return (
    <div className="playback-controls">
      <div className="playback-nav">
        <button onClick={onFirst} aria-label="first seam">⏮</button>
        <button onClick={onPrev} aria-label="previous">←</button>
        <button onClick={onPlayToggle} aria-label={isPlaying ? 'pause' : 'play'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={onNext} aria-label="next">→</button>
        <button onClick={onLast} aria-label="last seam">⏭</button>
      </div>
      <div className="playback-counter">
        stage {STAGE_NUM[currentStage]}/4 · seam {currentSeam + 1}/{totalSeams}
      </div>
      <button className="playback-speed" onClick={onSpeedCycle} aria-label="cycle speed">
        {speed}×
      </button>
    </div>
  );
}
