import { useEffect, useRef, useState } from 'react';
import type { Stage } from '../../app/navigation';
import type { GlobeScene } from './globeScene';
import { webglAvailable } from './webgl';
import { globeLayout } from './layout';

interface Props {
  stage: Stage;
  revealed: boolean;
  instantReveal: boolean;
  motion: boolean;
  reduced: boolean;
  forceFallback?: boolean;
}

/**
 * Renders the WebGL globe, or — if WebGL is missing, fails or the context is lost —
 * a CSS fallback that keeps the same composition (painted texture scrolling inside
 * a shaded disc).
 */
export function RetroGlobe({ stage, revealed, instantReveal, motion, reduced, forceFallback }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GlobeScene | null>(null);
  const [failed, setFailed] = useState(() => forceFallback || !webglAvailable());

  // Latest props, so a scene created after the lazy import starts in the current state.
  const propsRef = useRef({ stage, motion, reduced, revealed, instantReveal });
  propsRef.current = { stage, motion, reduced, revealed, instantReveal };

  useEffect(() => {
    if (failed || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let scene: GlobeScene | null = null;
    let cancelled = false;
    const onResize = () => scene?.resize();
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    // Three.js is loaded on demand so the title paints before the 3D code arrives.
    import('./globeScene')
      .then(({ GlobeScene }) => {
        if (cancelled) return;
        const p = propsRef.current;
        scene = new GlobeScene(canvas, { stage: p.stage, motion: p.motion, reduced: p.reduced, onFail: () => setFailed(true) });
        scene.setRevealTarget(p.revealed ? 1 : 0, p.instantReveal);
        sceneRef.current = scene;
        window.addEventListener('resize', onResize);
        window.addEventListener('pointermove', onPointer, { passive: true });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      scene?.dispose();
      sceneRef.current = null;
    };
    // The scene is created once; later prop changes are pushed imperatively below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  useEffect(() => sceneRef.current?.setStage(stage), [stage]);
  useEffect(() => sceneRef.current?.setMotion(motion, reduced), [motion, reduced]);
  useEffect(() => sceneRef.current?.setRevealTarget(revealed ? 1 : 0, instantReveal), [revealed, instantReveal]);

  if (failed) return <FallbackGlobe stage={stage} revealed={revealed} motion={motion && !reduced} />;
  return <canvas ref={canvasRef} className="globe-canvas" aria-hidden="true" data-testid="globe-canvas" />;
}

function FallbackGlobe({ stage, revealed, motion }: { stage: Stage; revealed: boolean; motion: boolean }) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const l = globeLayout(stage, size.w, size.h);
  return (
    <div
      className={`globe-fallback${motion ? ' is-spinning' : ''}${revealed ? ' is-revealed' : ''}`}
      data-testid="globe-fallback"
      aria-hidden="true"
      style={{
        left: l.cx - l.r,
        top: l.cy - l.r,
        width: l.r * 2,
        height: l.r * 2,
        filter: `brightness(${l.dim})`,
        backgroundImage: `url(${import.meta.env.BASE_URL}textures/globe-albedo-small.webp)`,
      }}
    >
      <div className="globe-fallback__shade" />
    </div>
  );
}
