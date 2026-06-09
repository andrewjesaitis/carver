import { useRef, useCallback } from 'react';
import type { KeyboardEvent } from 'react';

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

const TABS = ['original', 'carved'] as const;

function formatSize(size: Size | null): string {
  if (!size) return '—';
  return `${size.w}×${size.h}`;
}

export default function CanvasTabs({ activeTab, originalSize, carvedSize, onTabChange }: Props) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([null, null]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (dir === 0) return;
      const idx = TABS.indexOf(activeTab);
      const enabled = (tab: (typeof TABS)[number]) =>
        tab === 'original' ? originalSize !== null : carvedSize !== null;
      let next = idx;
      do {
        next = (next + dir + TABS.length) % TABS.length;
      } while (!enabled(TABS[next]) && next !== idx);
      if (next === idx) return;
      onTabChange(TABS[next]);
      tabRefs.current[next]?.focus();
    },
    [activeTab, originalSize, carvedSize, onTabChange],
  );

  const sizes: Record<(typeof TABS)[number], Size | null> = {
    original: originalSize,
    carved: carvedSize,
  };
  const labels: Record<(typeof TABS)[number], string> = {
    original: 'Original',
    carved: 'Carved',
  };

  return (
    <div role="tablist" aria-label="Image view" className="canvas-tabs">
      {TABS.map((tab, i) => (
        <button
          key={tab}
          ref={(el) => {
            tabRefs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          tabIndex={activeTab === tab ? 0 : -1}
          className={`canvas-tab ${activeTab === tab ? 'canvas-tab--active' : ''}`}
          onClick={() => onTabChange(tab)}
          onKeyDown={handleKeyDown}
          disabled={!sizes[tab]}
        >
          {labels[tab]} · {formatSize(sizes[tab])}
        </button>
      ))}
    </div>
  );
}
