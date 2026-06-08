import type { VisualizerStage, VisualizerFrame, Derivative } from '../types';
import GreyscaleDetail from './GreyscaleDetail';
import EnergyDetail from './EnergyDetail';
import CostDetail from './CostDetail';

interface Props {
  stage: VisualizerStage;
  frame: VisualizerFrame;
  derivative: Derivative;
}

export default function StageInspector({ stage, frame, derivative }: Props) {
  if (stage === 'image' || stage === 'seam') return null;
  if (stage === 'greyscale') return <GreyscaleDetail />;
  if (stage === 'energy')
    return <EnergyDetail sample={frame.kernelSample} derivative={derivative} />;
  return <CostDetail detail={frame.costDetail} />;
}
