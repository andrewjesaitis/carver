import type { VisualizerStage, VisualizerFrame } from '../types';
import KernelDetail from './KernelDetail';
import CostDetail from './CostDetail';

interface Props {
  stage: VisualizerStage;
  frame: VisualizerFrame;
}

export default function StageInspector({ stage, frame }: Props) {
  if (stage === 'image' || stage === 'seam') return null;
  if (stage === 'energy') return <KernelDetail sample={frame.kernelSample} />;
  return <CostDetail detail={frame.costDetail} />;
}
