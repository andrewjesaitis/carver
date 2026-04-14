import React from 'react';

interface Size {
  w: number;
  h: number;
}

interface Props {
  activeTab: 'original' | 'carved';
  originalSize: Size | null;
  carvedSize: Size | null;
  onTabChange: (tab: 'original' | 'carved') => void;
}

function formatSize(size: Size | null): string {
  if (!size) return '—';
  return `${size.w}×${size.h}`;
}

export default function CanvasTabs({ activeTab, originalSize, carvedSize, onTabChange }: Props) {
  return (
    <div className="canvas-tabs">
      <button
        type="button"
        className={`canvas-tab ${activeTab === 'original' ? 'canvas-tab--active' : ''}`}
        onClick={() => onTabChange('original')}
        disabled={!originalSize}
      >
        Original · {formatSize(originalSize)}
      </button>
      <button
        type="button"
        className={`canvas-tab ${activeTab === 'carved' ? 'canvas-tab--active' : ''}`}
        onClick={() => onTabChange('carved')}
        disabled={!carvedSize}
      >
        Carved · {formatSize(carvedSize)}
      </button>
    </div>
  );
}
