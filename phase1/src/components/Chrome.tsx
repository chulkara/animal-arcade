// Screen furniture: backdrop, grain, frame ornaments, footer and the quick sound toggle.
import { useEffect, useMemo } from 'react';

export function Backdrop() {
  // Portolan-chart rhumb lines radiating from two wind-rose points: a quiet cartographic texture.
  const lines = useMemo(() => {
    const out: string[] = [];
    for (const [cx, cy] of [
      [18, 82],
      [86, 20],
    ]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        out.push(`M${cx} ${cy} L${cx + Math.cos(a) * 160} ${cy + Math.sin(a) * 160}`);
      }
    }
    return out.join(' ');
  }, []);
  return (
    <div className="backdrop" aria-hidden="true">
      <svg className="backdrop__rhumb" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <path d={lines} stroke="#c9a159" strokeWidth="0.06" fill="none" />
      </svg>
      <div className="backdrop__vignette" />
    </div>
  );
}

export function Grain({ on, animated }: { on: boolean; animated: boolean }) {
  const url = useMemo(() => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const g = c.getContext('2d');
      if (!g) return '';
      const img = g.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 110 + Math.random() * 146;
        img.data[i] = v;
        img.data[i + 1] = v * 0.96;
        img.data[i + 2] = v * 0.88;
        img.data[i + 3] = Math.random() * 34;
      }
      g.putImageData(img, 0, 0);
      return c.toDataURL();
    } catch {
      return '';
    }
  }, []);
  if (!on || !url) return null;
  return <div className={`grain${animated ? ' is-animated' : ''}`} style={{ backgroundImage: `url(${url})` }} aria-hidden="true" data-testid="grain" />;
}

export function FrameOrnaments() {
  const corner = (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path d="M2 58 V18 C2 9 9 2 18 2 H58" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 58 V22 C8 14 14 8 22 8 H58" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <path d="M14 40 C14 25 25 14 40 14 C30 19 22 26 20 34 C19 39 24 41 26 37 C27 34 24 33 23 35" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
  return (
    <div className="frame" aria-hidden="true">
      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <div key={c} className={`frame__corner frame__corner--${c}`}>
          {corner}
        </div>
      ))}
    </div>
  );
}

export function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="sound-toggle" onClick={onToggle} aria-pressed={!muted} aria-label={muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'} data-testid="sound-toggle">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9 H7 L12 5 V19 L7 15 H3 Z" fill="currentColor" />
        {muted ? (
          <path d="M16 9 L21 15 M21 9 L16 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        ) : (
          <path d="M15.5 9 C17 10.5 17 13.5 15.5 15 M18 7 C21 10 21 14 18 17" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

export function useDocumentClass(name: string, on: boolean) {
  useEffect(() => {
    document.documentElement.classList.toggle(name, on);
  }, [name, on]);
}
