import type { ReactNode } from 'react';
import type { Screen } from '../app/navigation';
import { CrestArt } from './logo/Crest';

/** Gilded hairline cartouche with spiral-curl corners — the one panel shape used everywhere. */
export function Panel({ kicker, title, children, onBack, testId }: { kicker: string; title: string; children: ReactNode; onBack: () => void; testId: string }) {
  return (
    <section className="panel" role="dialog" aria-modal="false" aria-labelledby={`${testId}-title`} data-testid={testId}>
      <svg className="panel__frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0.8" y="0.8" width="98.4" height="98.4" fill="none" stroke="#c9a159" strokeWidth="0.25" vectorEffect="non-scaling-stroke" />
        <rect x="2" y="2" width="96" height="96" fill="none" stroke="#c9a159" strokeOpacity="0.45" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
      </svg>
      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <svg key={c} className={`panel__corner panel__corner--${c}`} viewBox="0 0 40 40" aria-hidden="true">
          <path d="M2 38 V14 C2 7 7 2 14 2 H38" fill="none" stroke="#c9a159" strokeWidth="1.6" />
          <path d="M8 30 C8 18 18 8 30 8 C22 12 14 18 12 26 C11 30 16 32 18 28 C19 25 16 24 15 26" fill="none" stroke="#c9a159" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ))}
      <header className="panel__head">
        <p className="panel__kicker">{kicker}</p>
        <h2 className="panel__title" id={`${testId}-title`}>
          {title}
        </h2>
      </header>
      <div className="panel__body">{children}</div>
      <button type="button" className="panel__back" onClick={onBack} data-testid="panel-back">
        <span aria-hidden="true">◂</span> BACK <kbd>ESC</kbd>
      </button>
    </section>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <p className="status-tag">{children}</p>;
}

function CardBack({ empty = false }: { empty?: boolean }) {
  if (empty) return <div className="cardslot" aria-hidden="true" />;
  return (
    <svg className="cardback" viewBox="0 0 63 88" aria-hidden="true">
      <rect x="1" y="1" width="61" height="86" rx="3" fill="#18194a" stroke="#c9a159" strokeWidth="1.2" />
      <rect x="4.5" y="4.5" width="54" height="79" rx="1.5" fill="none" stroke="#c9a159" strokeOpacity="0.6" strokeWidth="0.5" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="31.5" y1="44" x2={31.5 + 40 * Math.cos((i * Math.PI) / 6)} y2={44 + 40 * Math.sin((i * Math.PI) / 6)} stroke="#c9a159" strokeOpacity="0.18" strokeWidth="0.5" />
      ))}
      <circle cx="31.5" cy="44" r="20" fill="none" stroke="#c9a159" strokeOpacity="0.5" strokeWidth="0.5" />
      <g transform="translate(31.5 46) scale(0.26)">
        <CrestArt idp="cb" />
      </g>
    </svg>
  );
}

export function FeaturePreview({ screen, onBack }: { screen: Screen; onBack: () => void }) {
  switch (screen) {
    case 'SOLO_PREVIEW':
      return (
        <Panel kicker="1 PLAYER" title="SOLO EXPEDITION" onBack={onBack} testId="preview-solo">
          <p className="panel__lede">Challenge the wild.</p>
          <p>Choose an animal, stop the attack reel, then the power reel, and outlast a run of computer opponents.</p>
          <Status>IN DEVELOPMENT · ARRIVES WITH THE BATTLE PHASE</Status>
        </Panel>
      );
    case 'MULTIPLAYER_PREVIEW':
      return (
        <Panel kicker="2 PLAYERS" title="VERSUS" onBack={onBack} testId="preview-versus">
          <ul className="modes">
            <li>
              <b>LOCAL DUEL</b>
              <span>Two players on one device, each with their own controls.</span>
              <em>PLANNED</em>
            </li>
            <li>
              <b>ONLINE DUEL</b>
              <span>Matches over a network. Not built yet.</span>
              <em>PLANNED · LATER PHASE</em>
            </li>
          </ul>
          <Status>NEITHER MODE IS PLAYABLE YET</Status>
        </Panel>
      );
    case 'BINDER_PREVIEW':
      return (
        <Panel kicker="MY BINDER" title="THE COLLECTION" onBack={onBack} testId="preview-binder">
          <div className="binder" aria-hidden="true">
            <div className="binder__page">
              {Array.from({ length: 6 }, (_, i) => (
                <CardBack key={i} empty={i !== 0} />
              ))}
            </div>
            <div className="binder__spine" />
            <div className="binder__page">
              {Array.from({ length: 6 }, (_, i) => (
                <CardBack key={i} empty />
              ))}
            </div>
          </div>
          <p>Animal, Strong and Miracle cards you win will be kept here, with their rare finishes.</p>
          <Status>EMPTY · COLLECTING BEGINS IN A LATER PHASE</Status>
        </Panel>
      );
    case 'HELP_PREVIEW':
      return (
        <Panel kicker="HOW TO PLAY" title="FIELD GUIDE" onBack={onBack} testId="preview-help">
          <dl className="guide">
            <div>
              <dt>CARDS</dt>
              <dd>Pair an Animal card with a Strong card and a Miracle card.</dd>
            </div>
            <div>
              <dt>ATTACK REEL</dt>
              <dd>Stop it to choose Guts, Technique or Power.</dd>
            </div>
            <div>
              <dt>POWER REEL</dt>
              <dd>Stop it again. The stronger result strikes.</dd>
            </div>
          </dl>
          <Status>THE FULL GUIDE ARRIVES WITH GAMEPLAY</Status>
        </Panel>
      );
    default:
      return null;
  }
}
