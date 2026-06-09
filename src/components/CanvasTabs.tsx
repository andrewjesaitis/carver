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
      const idx = TABS.indexOf(activeTab);
      if (e.key === 'ArrowRight') {
        const next = (idx + 1) % TABS.length;
        onTabChange(TABS[next]);
        tabRefs.current[next]?.focus();
      } else if (e.key === 'ArrowLeft') {
        const prev = (idx - 1 + TABS.length) % TABS.length;
        onTabChange(TABS[prev]);
        tabRefs.current[prev]?.focus();
      }
    },
    [activeTab, onTabChange],
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
          ref={el => {
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
