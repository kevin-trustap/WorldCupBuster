'use client';

import { useEffect, useState } from 'react';

interface Section {
  id: string;
  icon: string;
  label: string;
}

export default function PageNav({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    // Track which sections are currently intersecting and their ratios
    const intersectingMap = new Map<string, number>();

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              intersectingMap.set(id, entry.intersectionRatio);
            } else {
              intersectingMap.delete(id);
            }
          }
          // Pick the section with highest intersecting ratio
          if (intersectingMap.size > 0) {
            let best = '';
            let bestRatio = -1;
            Array.from(intersectingMap.entries()).forEach(([sid, ratio]) => {
              if (ratio > bestRatio) {
                bestRatio = ratio;
                best = sid;
              }
            });
            setActiveId(best);
          }
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [sections]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#252525',
      borderTop: '1px solid rgba(255,255,255,0.10)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
      display: 'flex',
      gap: 6,
      padding: '8px 12px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      {sections.map(({ id, icon, label }) => {
        const isActive = activeId === id;
        return (
          <button
            key={id}
            onClick={() => handleClick(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 99,
              border: isActive ? 'none' : '0.5px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
              background: isActive ? '#378ADD' : 'rgba(255,255,255,0.05)',
              color: isActive ? '#fff' : '#aaa',
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
