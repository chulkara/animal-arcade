import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { initialNav, navReducer, stageFor, SUB_SCREENS, type NavEvent, type Screen } from './navigation';
import { useReducedMotion, useSettings, useSystemReducedMotion } from './hooks';
import { actionForKey, GAMEPAD_BUTTONS, type Action } from '../input/controls';
import { audio } from '../audio/audioManager';
import { hasSeenIntro, markIntroSeen } from '../state/settings';
import { RetroGlobe } from '../graphics/globe/RetroGlobe';
import { NoahsArkadeLogo } from '../components/logo/NoahsArkadeLogo';
import { MainMenu } from '../components/MainMenu';
import { OptionsMenu } from '../components/OptionsMenu';
import { FeaturePreview, Panel } from '../components/Panel';
import { Backdrop, FrameOrnaments, Grain, SoundToggle } from '../components/Chrome';

type IntroPhase = 'dark' | 'globe' | 'logo' | 'done';

const SCREEN_NAMES: Partial<Record<Screen, string>> = {
  TITLE: 'Title screen. Press start.',
  MAIN_MENU: 'Main menu',
  SOLO_PREVIEW: '1 Player preview',
  MULTIPLAYER_PREVIEW: '2 Players preview',
  BINDER_PREVIEW: 'My Binder preview',
  HELP_PREVIEW: 'How to Play preview',
  OPTIONS: 'Options',
};

export function App() {
  const params = new URLSearchParams(location.search);
  const { settings, update, replace } = useSettings();
  const systemReduced = useSystemReducedMotion();
  const reduced = useReducedMotion(settings);
  const [nav, rawDispatch] = useReducer(navReducer, initialNav);
  const [intro, setIntro] = useState<IntroPhase>('dark');
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [returning] = useState(() => hasSeenIntro());
  const optionsHandler = useRef<((a: Action) => boolean) | null>(null);
  const navRef = useRef(nav);
  navRef.current = nav;

  const dispatch = useCallback((e: NavEvent) => rawDispatch(e), []);

  // ---- Boot + intro timeline (skippable at any moment) ----
  useEffect(() => {
    let cancelled = false;
    const fonts = (document as any).fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 900))]).then(() => {
      if (!cancelled) dispatch({ type: 'BOOTED' });
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (nav.screen !== 'INTRO') return;
    const fast = reduced || returning || params.has('skipintro');
    const t = fast ? { globe: 0, logo: reduced ? 0 : 250, done: reduced ? 0 : 1100 } : { globe: 250, logo: 1450, done: 3100 };
    const timers = [
      setTimeout(() => setIntro((p) => (p === 'dark' ? 'globe' : p)), t.globe),
      setTimeout(() => {
        setIntro((p) => (p === 'done' ? p : 'logo'));
        if (audio.unlocked) audio.play('reveal');
      }, t.logo),
      setTimeout(() => dispatch({ type: 'INTRO_DONE' }), t.done),
    ];
    markIntroSeen();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.screen]);

  useEffect(() => {
    // Any route past the intro means everything is revealed (covers skipping).
    if (nav.screen !== 'BOOT' && nav.screen !== 'INTRO') setIntro('done');
  }, [nav.screen]);

  // ---- Unified input: keyboard, pointer, gamepad → semantic actions ----
  const handleAction = useCallback(
    (a: Action | 'ANY') => {
      const { screen } = navRef.current;
      if (screen === 'BOOT' || screen === 'INTRO' || screen === 'TITLE') {
        audio.unlock();
        audio.play('start');
        audio.startMusic();
        dispatch({ type: 'START' });
        return;
      }
      if (a === 'ANY') return;
      if (screen === 'OPTIONS' && optionsHandler.current?.(a)) return;
      if (screen === 'MAIN_MENU') {
        if (a === 'UP' || a === 'DOWN') {
          dispatch({ type: 'MOVE', delta: a === 'UP' ? -1 : 1 });
          audio.play('tick');
        } else if (a === 'CONFIRM') {
          dispatch({ type: 'CONFIRM' });
          audio.play('confirm');
        } else if (a === 'BACK') {
          dispatch({ type: 'BACK' });
          audio.play('back');
        }
        return;
      }
      if (SUB_SCREENS.includes(screen) && (a === 'BACK' || (a === 'CONFIRM' && screen !== 'OPTIONS'))) {
        dispatch({ type: 'BACK' });
        audio.play('back');
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      audio.unlock();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Tab') {
        setKeyboardFocus(true);
        return;
      }
      if (e.code === 'KeyM' && navRef.current.screen !== 'BOOT') {
        update({ muted: !settingsRef.current.muted });
        return;
      }
      const a = actionForKey(e.code);
      const screen = navRef.current.screen;
      const preMenu = screen === 'BOOT' || screen === 'INTRO' || screen === 'TITLE';
      if (!a && !preMenu) return;
      if (preMenu && (e.key === 'Shift' || e.key === 'CapsLock')) return;
      e.preventDefault();
      if (e.repeat && (a === 'CONFIRM' || a === 'BACK')) return;
      setKeyboardFocus(true);
      handleAction(a ?? 'ANY');
    };
    const onPointer = (e: PointerEvent) => {
      audio.unlock();
      if (e.pointerType === 'mouse') setKeyboardFocus(false);
      const screen = navRef.current.screen;
      if (screen === 'BOOT' || screen === 'INTRO' || screen === 'TITLE') {
        const t = e.target as HTMLElement;
        if (t.closest('.sound-toggle')) return;
        handleAction('ANY');
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [handleAction, update]);

  // Gamepad (standard mapping) — polled only while a pad is connected.
  useEffect(() => {
    let raf = 0;
    const prev: Record<number, boolean> = {};
    const poll = () => {
      const pads = navigator.getGamepads?.() ?? [];
      for (const p of pads) {
        if (!p) continue;
        for (const [idx, action] of Object.entries(GAMEPAD_BUTTONS)) {
          const pressed = !!p.buttons[+idx]?.pressed;
          if (pressed && !prev[+idx]) {
            audio.unlock();
            setKeyboardFocus(true);
            handleAction(action);
          }
          prev[+idx] = pressed;
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

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const stage = stageFor(nav.screen);
  const subOpen = SUB_SCREENS.includes(nav.screen);
  const globeRevealed = intro !== 'dark';
  const motionAllowed = !reduced;

  const goBack = () => handleAction('BACK');

  return (
    <div
      className="app"
      data-screen={nav.screen}
      data-stage={stage}
      data-intro={intro}
      data-reduced={reduced ? 'true' : 'false'}
      data-testid="app"
    >
      <Backdrop />
      <RetroGlobe
        stage={stage}
        revealed={globeRevealed}
        instantReveal={reduced}
        motion={settings.globeMotion}
        reduced={reduced}
        forceFallback={params.has('nowebgl')}
      />
      <FrameOrnaments />

      <h1 className="logo-slot" data-testid="logo">
        <NoahsArkadeLogo variant="full" />
      </h1>

      <button type="button" className="press-start" data-testid="press-start" tabIndex={nav.screen === 'TITLE' ? 0 : -1} aria-hidden={nav.screen !== 'TITLE'} onClick={() => handleAction('ANY')}>
        <span className="press-start__rule" aria-hidden="true" />
        <span className="press-start__label">PRESS START</span>
        <span className="press-start__rule" aria-hidden="true" />
        <span className="press-start__hint press-start__hint--keys" aria-hidden="true">
          ENTER · SPACE · CLICK
        </span>
        <span className="press-start__hint press-start__hint--touch" aria-hidden="true">
          TAP ANYWHERE
        </span>
      </button>

      <MainMenu
        active={nav.screen === 'MAIN_MENU'}
        index={nav.menuIndex}
        keyboardFocus={keyboardFocus}
        onHover={(i) => {
          if (i !== navRef.current.menuIndex) {
            dispatch({ type: 'HOVER', index: i });
            audio.play('tick');
          }
        }}
        onConfirm={(i) => {
          dispatch({ type: 'CONFIRM', index: i });
          audio.play('confirm');
        }}
      />

      <div className={`panel-slot${subOpen ? ' is-open' : ''}`} key={subOpen ? nav.screen : 'none'}>
        {nav.screen === 'OPTIONS' ? (
          <Panel kicker="OPTIONS" title="CABINET SETTINGS" onBack={goBack} testId="preview-options">
            <OptionsMenu
              settings={settings}
              systemReduced={systemReduced}
              update={update}
              replace={replace}
              onBack={goBack}
              registerHandler={(h) => (optionsHandler.current = h)}
            />
          </Panel>
        ) : subOpen ? (
          <FeaturePreview screen={nav.screen} onBack={goBack} />
        ) : null}
      </div>

      <footer className="hud">
        <p className="hud__hints" aria-hidden="true">
          {nav.screen === 'MAIN_MENU' && (
            <>
              <kbd>↑</kbd>
              <kbd>↓</kbd> SELECT <span className="dot">·</span> <kbd>ENTER</kbd> CONFIRM <span className="dot">·</span> <kbd>ESC</kbd> TITLE
            </>
          )}
          {nav.screen === 'OPTIONS' && (
            <>
              <kbd>↑</kbd>
              <kbd>↓</kbd> CHOOSE <span className="dot">·</span> <kbd>←</kbd>
              <kbd>→</kbd> ADJUST <span className="dot">·</span> <kbd>ESC</kbd> BACK
            </>
          )}
          {subOpen && nav.screen !== 'OPTIONS' && (
            <>
              <kbd>ESC</kbd> BACK
            </>
          )}
        </p>
        <p className="hud__credit" aria-hidden="true">
          <span className="hud__freeplay">FREE PLAY</span>
          <span className="dot">·</span>
          <span>© 2026 NOAH'S ARKADE</span>
        </p>
      </footer>

      {nav.screen !== 'BOOT' && <SoundToggle muted={settings.muted} onToggle={() => (audio.unlock(), update({ muted: !settings.muted }))} />}
      <Grain on={settings.grain} animated={motionAllowed} />
      <p className="sr-only" aria-live="polite">
        {SCREEN_NAMES[nav.screen] ?? ''}
      </p>
    </div>
  );
}
