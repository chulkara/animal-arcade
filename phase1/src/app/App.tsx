import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { initialNav, MENU_ITEMS, navReducer, SUB_SCREENS, px, py, type NavEvent, type Screen } from './navigation';
import { useReducedMotion, useSettings, useSystemReducedMotion } from './hooks';
import { actionForKey, GAMEPAD_BUTTONS, type Action } from '../input/controls';
import { audio } from '../audio/audioManager';
import { hasSeenIntro, markIntroSeen } from '../state/settings';
import { PaintedStage } from '../components/Stage';
import { MenuCursor } from '../components/MenuCursor';
import { Plate } from '../components/Plate';
import { BinderPreview, CardsPreview, Options, PlaySelect, ShopPreview } from '../components/Screens';

type Intro = 'off' | 'beam' | 'reveal' | 'done';

const MIN_W = 960;
const MIN_H = 540;

const TITLES: Partial<Record<Screen, string>> = {
  PLAY_SELECT: 'SELECT MODE',
  CARDS_PREVIEW: 'MY CARDS',
  BINDER_PREVIEW: 'BINDER',
  SHOP_PREVIEW: 'SHOP',
  OPTIONS: 'SETTINGS',
};

const ANNOUNCE: Partial<Record<Screen, string>> = {
  TITLE: 'Title screen. Press start.',
  MAIN_MENU: 'Main menu',
  PLAY_SELECT: 'Play: select mode',
  CARDS_PREVIEW: 'My cards',
  BINDER_PREVIEW: 'Binder',
  SHOP_PREVIEW: 'Shop',
  OPTIONS: 'Settings',
};

function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

export function App() {
  const params = new URLSearchParams(location.search);
  const { settings, update, replace } = useSettings();
  const systemReduced = useSystemReducedMotion();
  const reduced = useReducedMotion(settings);
  const [nav, rawDispatch] = useReducer(navReducer, initialNav);
  const [intro, setIntro] = useState<Intro>('off');
  const [pressing, setPressing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [startFlash, setStartFlash] = useState(false);
  const [artReady, setArtReady] = useState(false);
  const [returning] = useState(() => hasSeenIntro());
  const vp = useViewport();
  const tooSmall = vp.w < MIN_W || vp.h < MIN_H;

  const navRef = useRef(nav);
  navRef.current = nav;
  const busy = useRef(false); // blocks input during the short press/arm beats
  const subHandler = useRef<((a: Action) => boolean) | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const dispatch = useCallback((e: NavEvent) => rawDispatch(e), []);
  const register = useCallback((h: ((a: Action) => boolean) | null) => {
    subHandler.current = h;
  }, []);

  // ---- boot once the painting has decoded ----
  useEffect(() => {
    if (!artReady || tooSmall || nav.screen !== 'BOOT') return;
    dispatch({ type: 'BOOTED' });
  }, [artReady, tooSmall, nav.screen, dispatch]);

  // ---- intro: CRT power-on → painting revealed → PRESS START ----
  useEffect(() => {
    if (nav.screen !== 'INTRO') return;
    const fast = returning || params.has('skipintro');
    const t = reduced ? { beam: 0, reveal: 0, done: 0 } : fast ? { beam: 0, reveal: 260, done: 900 } : { beam: 120, reveal: 520, done: 2100 };
    const ids = [
      setTimeout(() => {
        setIntro((p) => (p === 'done' ? p : 'beam'));
        if (audio.unlocked) audio.play('power');
      }, t.beam),
      setTimeout(() => setIntro((p) => (p === 'done' ? p : 'reveal')), t.reveal),
      setTimeout(() => dispatch({ type: 'INTRO_DONE' }), t.done),
    ];
    markIntroSeen();
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.screen]);

  useEffect(() => {
    if (nav.screen !== 'BOOT' && nav.screen !== 'INTRO') setIntro('done');
  }, [nav.screen]);

  // ---- input ----
  const start = useCallback(() => {
    if (busy.current) return;
    audio.unlock();
    audio.play('start');
    audio.startMusic();
    const fromTitle = navRef.current.screen === 'TITLE';
    if (fromTitle && !reduced) {
      // classic arcade confirm: the prompt blinks fast, then the menu lights up row by row
      busy.current = true;
      setStartFlash(true);
      setTimeout(() => {
        setStartFlash(false);
        dispatch({ type: 'START' });
        setArmed(true);
        busy.current = false;
        setTimeout(() => setArmed(false), 900);
      }, 420);
    } else {
      dispatch({ type: 'START' });
    }
  }, [dispatch, reduced]);

  const confirmMenu = useCallback(
    (index?: number) => {
      if (busy.current) return;
      if (index !== undefined && index !== navRef.current.menuIndex) dispatch({ type: 'HOVER', index });
      audio.play('confirm');
      if (reduced) return dispatch({ type: 'CONFIRM', index });
      busy.current = true;
      setPressing(true);
      setTimeout(() => {
        setPressing(false);
        busy.current = false;
        dispatch({ type: 'CONFIRM', index });
      }, 190);
    },
    [dispatch, reduced],
  );

  const handleAction = useCallback(
    (a: Action | 'ANY') => {
      const { screen } = navRef.current;
      if (screen === 'BOOT') return;
      if (screen === 'INTRO' || screen === 'TITLE') return start();
      if (busy.current || a === 'ANY') return;
      if (SUB_SCREENS.includes(screen)) {
        if (a === 'BACK') {
          dispatch({ type: 'BACK' });
          audio.play('back');
        } else subHandler.current?.(a);
        return;
      }
      if (screen === 'MAIN_MENU') {
        if (a === 'UP' || a === 'LEFT' || a === 'DOWN' || a === 'RIGHT') {
          dispatch({ type: 'MOVE', delta: a === 'UP' || a === 'LEFT' ? -1 : 1 });
          audio.play('tick');
        } else if (a === 'CONFIRM') confirmMenu();
        else if (a === 'BACK') {
          dispatch({ type: 'BACK' });
          audio.play('back');
        }
      }
    },
    [dispatch, start, confirmMenu],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      audio.unlock();
      if (e.code === 'KeyM') {
        update({ muted: !settingsRef.current.muted });
        return;
      }
      if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'CapsLock') return;
      const a = actionForKey(e.code);
      const screen = navRef.current.screen;
      const pre = screen === 'INTRO' || screen === 'TITLE';
      if (!a && !pre) return;
      e.preventDefault();
      if (e.repeat && (a === 'CONFIRM' || a === 'BACK' || pre)) return;
      handleAction(a ?? 'ANY');
    };
    const onPointer = (e: PointerEvent) => {
      audio.unlock();
      const screen = navRef.current.screen;
      if ((screen === 'INTRO' || screen === 'TITLE') && e.button === 0) handleAction('ANY');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [handleAction, update]);

  // gamepad (standard mapping), polled only once a pad connects
  useEffect(() => {
    let raf = 0;
    const prev: Record<number, boolean> = {};
    const poll = () => {
      for (const p of navigator.getGamepads?.() ?? []) {
        if (!p) continue;
        for (const [idx, action] of Object.entries(GAMEPAD_BUTTONS)) {
          const down = !!p.buttons[+idx]?.pressed;
          if (down && !prev[+idx]) {
            audio.unlock();
            handleAction(action);
          }
          prev[+idx] = down;
        }
      }
      raf = requestAnimationFrame(poll);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(poll);
    };
    window.addEventListener('gamepadconnected', on);
    return () => {
      window.removeEventListener('gamepadconnected', on);
      cancelAnimationFrame(raf);
    };
  }, [handleAction]);

  const s = nav.screen;
  const subOpen = SUB_SCREENS.includes(s);
  const inMenu = s === 'MAIN_MENU';
  const back = () => handleAction('BACK');
  const fromRect = MENU_ITEMS[nav.menuIndex].rect;

  if (tooSmall) {
    return (
      <div className="desktop-only" data-testid="desktop-only">
        <p className="desktop-only__title">NOAH'S ARKADE</p>
        <p>This cabinet is built for desktop.</p>
        <p className="desktop-only__hint">
          Make the window at least {MIN_W} × {MIN_H}
          <br />
          (now {vp.w} × {vp.h}).
        </p>
      </div>
    );
  }

  return (
    <div className="app" data-screen={s} data-intro={intro} data-reduced={reduced ? 'true' : 'false'} data-testid="app">
      <PaintedStage onArtLoad={() => setArtReady(true)}>
        {/* a single glint on the painted star every few seconds, menu only */}
        <span className="glint" style={{ left: px(1103), top: py(214) }} aria-hidden="true" />

        <MenuCursor
          index={nav.menuIndex}
          visible={inMenu || subOpen}
          interactive={inMenu}
          pressing={pressing}
          armed={armed}
          onHover={(i) => {
            if (!busy.current && i !== navRef.current.menuIndex) {
              dispatch({ type: 'HOVER', index: i });
              audio.play('tick');
            }
          }}
          onConfirm={(i) => confirmMenu(i)}
        />

        <button
          type="button"
          className={`press-start${startFlash ? ' is-flashing' : ''}`}
          style={{ left: px(836), top: py(893) }}
          tabIndex={s === 'TITLE' ? 0 : -1}
          aria-hidden={s !== 'TITLE'}
          data-testid="press-start"
          onClick={() => handleAction('ANY')}
        >
          PRESS START
        </button>

        <div className={`veil${subOpen ? ' is-on' : ''}`} aria-hidden="true" />
        {subOpen && (
          <Plate key={s} title={TITLES[s] ?? ''} from={fromRect} onBack={back} testId={`plate-${s.toLowerCase()}`}>
            {s === 'PLAY_SELECT' && <PlaySelect registerHandler={register} />}
            {s === 'CARDS_PREVIEW' && <CardsPreview />}
            {s === 'BINDER_PREVIEW' && <BinderPreview />}
            {s === 'SHOP_PREVIEW' && <ShopPreview />}
            {s === 'OPTIONS' && <Options settings={settings} systemReduced={systemReduced} update={update} replace={replace} registerHandler={register} />}
          </Plate>
        )}

        {settings.scanlines && <div className="scanlines" data-testid="scanlines" aria-hidden="true" />}

        {/* CRT power-on cover: two shutters part around a bright beam */}
        <div className="crt" aria-hidden="true">
          <span className="crt__half crt__half--top" />
          <span className="crt__half crt__half--bottom" />
          <span className="crt__beam" />
          <span className="crt__bloom" />
        </div>
      </PaintedStage>

      <p className="sr-only" aria-live="polite">
        {ANNOUNCE[s] ?? ''}
      </p>
    </div>
  );
}
