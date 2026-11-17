import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(path,'utf8');
const script=file('src/forestfall-video.js');
const ui=file('src/combat-ui.js');
const html=file('index.html');
const css=file('src/forestfall-video.css');

test('Forestfall video player is local-only, not bundled or uploaded',()=>{
 assert.ok(script.includes('URL.createObjectURL(file)'));
 assert.ok(script.includes('URL.revokeObjectURL(objectUrl)'));
 assert.ok(script.includes("ui.addEventListener('change'"));
 assert.ok(script.includes("data-forestfall-file"));
 assert.ok(script.includes("video.src=objectUrl"));
 assert.ok(!script.includes('fetch('));
 assert.ok(!script.includes('XMLHttpRequest'));
 assert.ok(!script.includes('serviceWorker'));
 assert.ok(!script.includes('localStorage'));
 assert.ok(!html.includes('Bear_performs_Forestfall_attack'));
});

test('a real Bear special hit invokes Forestfall, not an ordinary G/T/P attack',()=>{
 assert.ok(script.includes("window.addEventListener('arkade:reelstop'"));
 assert.ok(script.includes('event.detail?.hit'));
 assert.ok(script.includes("hit.kind!=='HIT'||!hit.special"));
 assert.ok(script.includes("s.animals?.[hit.attacker]?.id!=='bear'"));
 assert.ok(script.includes("NoahsArena3DCore?.battleEvent(s)"));
 assert.ok(script.includes('clipEvent.key===lastKey'));
 assert.ok(script.includes('playVideo({event:clipEvent})'));
});

test('Forestfall overlays the battle rather than mutating scoring or damage',()=>{
 assert.ok(script.includes('event.damage'));
 assert.ok(script.includes('video.currentTime<duration*CONTACT_RATIO'));
 assert.ok(script.includes('const CONTACT_RATIO=impactCore?.CONTACT/impactCore?.SOURCE_SECONDS'));
 assert.ok(script.includes("node.classList.add('ark-forestfall-impact')"));
 assert.ok(script.includes("if(!live)node.classList.add('ark-forestfall-reaction-visible')"));
 assert.ok(script.includes("video.addEventListener('ended',()=>close(true)"));
 assert.ok(script.includes("skip.addEventListener('click',()=>close(true))"));
 assert.ok(!script.includes('battle.stop('));
 assert.ok(!script.includes('nextRound()'));
 assert.ok(!script.includes('animals[hit.defender].hp='));
 assert.ok(css.includes('position:fixed;inset:0;z-index:150'));
});

test('the upload and non-scoring preview are optional and accessible',()=>{
 assert.ok(html.includes('./src/forestfall-video.css'));
 assert.ok(html.includes('./src/forestfall-video.js'));
 assert.ok(ui.includes('data-forestfall-choose'));
 assert.ok(ui.includes('data-forestfall-file'));
 assert.ok(ui.includes('data-forestfall-preview'));
 assert.ok(ui.includes('data-forestfall-status'));
 assert.ok(script.includes('LOCAL VIDEO PREVIEW · NO DAMAGE'));
 assert.ok(script.includes('video.playsInline=true'));
 assert.ok(script.includes("node.setAttribute('aria-modal','true')"));
 assert.ok(script.includes("resume.addEventListener('click'"));
 assert.ok(script.includes("window.NoahsForestfall=Object.freeze"));
});

test('local Forestfall controller is valid browser JavaScript',()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.match(script,/function playVideo\(/);
 assert.match(script,/function close\(/);
});

test('the Forestfall cinematic respects volume, mute and reduced motion',()=>{
 assert.ok(script.includes('video.volume=master*effects'));
 assert.ok(script.includes('video.muted=Boolean(settings.mute)||video.volume===0'));
 assert.ok(script.includes("prefers-reduced-motion: reduce"));
 assert.ok(script.includes('REDUCED MOTION ENABLED · PLAY VIDEO MANUALLY OR SKIP'));
 assert.ok(script.includes('video.play().catch('));
});


test('Forestfall preview is not silently blocked during either spinning reel',()=>{
 assert.ok(!script.includes("if(preview&&['ATTACK','POWER'].includes(s?.phase))return false"),
   'Reel-state guard prevented all previews until after a round ended');
 assert.ok(script.includes('Preview is deliberately non-scoring'));
 assert.ok(script.includes('Stop the Bear cinematic review before opening Forestfall.'));
 assert.ok(script.includes('Load the Forestfall MP4 before previewing it.'));
 assert.ok(script.includes("const node=document.createElement('section')"));
});


test('a scored Forestfall hit stages the actual defender response at the landing',()=>{
 assert.ok(script.includes('const CONTACT_RATIO=impactCore?.CONTACT/impactCore?.SOURCE_SECONDS'));
 assert.ok(script.includes('const REACTION_MS=1120'));
 assert.ok(script.includes("species=event?.defenderId&&window.NoahsRoster?.ANIMALS?.[event.defenderId]"));
 assert.ok(script.includes("animal.src=species.art"));
 assert.ok(script.includes('remainingHp+event.damage'));
 assert.ok(script.includes('previous/max'));
 assert.ok(script.includes('remains/max'));
 assert.ok(script.includes("node.classList.add('ark-forestfall-impact')"));
 assert.ok(script.includes("if(!live)node.classList.add('ark-forestfall-reaction-visible')"));
 assert.ok(script.includes('video.currentTime<duration*CONTACT_RATIO'));
 assert.ok(css.includes('.ark-forestfall-target-art'));
 assert.ok(css.includes('.ark-forestfall-target-health'));
 assert.ok(css.includes('ark-forestfall-defender-hit'));
});
test('Forestfall blocks interactions but always returns control after skip/complete/error',()=>{
 assert.ok(script.includes("document.getElementById('game')?.setAttribute('inert','')"));
 assert.ok(script.includes("document.getElementById('game')?.removeAttribute('inert')"));
 assert.ok(script.includes('arkade:forestfallopen'));
 assert.ok(script.includes('arkade:forestfallclose'));
 assert.ok(script.includes("video.addEventListener('ended',()=>close(true)"));
 assert.ok(script.includes("skip.addEventListener('click',()=>close(true))"));
 assert.ok(script.includes("if(event.key==='Escape')"));
 assert.ok(!script.includes('battle.stop('));
 assert.ok(!script.includes('nextRound()'));
});


test('Preview rehearses the real opposing species without applying HP loss',()=>{
 assert.ok(script.includes("if(preview&&!event&&state?.animals?.length===2)"));
 assert.ok(script.includes("const bearIndex=state.animals.findIndex(animal=>animal.id==='bear')"));
 assert.ok(script.includes("damage:0,remainingHp:state.animals[defender].hp"));
 assert.ok(script.includes("damage.textContent=preview?'PREVIEW · NO HP CHANGE'"));
 assert.ok(script.includes("result.textContent=preview?'PREVIEW · NO HP CHANGE'"));
 assert.ok(script.includes("'LOCAL VIDEO PREVIEW · NO HP CHANGES'"));
 assert.ok(!script.includes('battle.stop('));
});
