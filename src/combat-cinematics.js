/* Battle-stage visual director. A move is replayable and the opponent-specific
 * reaction stays separate. Designed to work with or without local 3D assets. */
(function(){
'use strict';
const api=window.NoahsCinematicCore,arena=window.NoahsArena3DCore;
const game=document.getElementById('game'),ui=document.getElementById('ui');
if(!api||!arena||!ui)return;
let stage=null,overlay=null,sequence=null,timer=0,lastBeat='',lastShot='',
  howlCued=false,winCued=false,slotStamp=null,stampUntil=0;
const reduce=()=>Boolean(window.__arkade?.getSettings()?.reducedMotion)||
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const onBattle=()=>window.__arkade?.getScreen()==='BATTLE_PLAY';
const battle=()=>window.NoahsCombat?.getState();
function cleanup(){
 if(timer)cancelAnimationFrame(timer);
 timer=0;
 // Earlier cleanup dropped the JS references without removing the actual
 // DOM node. Each new Bear review appended another .ark-cinema, leaving
 // LOW SWIPE painted over Guts, Power and even the final victory.
 if(stage)delete stage.dataset.cineBeat;
 overlay?.remove();
 ui.querySelectorAll('.combat-battlefield .ark-cinema').forEach(node=>node.remove());
 timer=0;lastBeat='';lastShot='';howlCued=false;winCued=false;
 sequence=null;stage=null;overlay=null;
 const root=ui.querySelector('.ark-reference-layout');
 root?.classList.remove('ark-cinematic-active','ark-cinematic-done');
}
function createOverlay(){
 const battlefield=ui.querySelector('.combat-battlefield');
 if(!battlefield)return;
 stage=battlefield;
 // A screenplay can replace its battlefield during state transitions.
 // There must be exactly one active film overlay at all times.
 battlefield.querySelectorAll('.ark-cinema').forEach(node=>node.remove());
 overlay=document.createElement('div');
 overlay.className='ark-cinema';
 overlay.setAttribute('aria-hidden','true');
 overlay.innerHTML='<div class="ark-cinema-letterbox ark-cinema-top"></div>'+
  '<div class="ark-cinema-letterbox ark-cinema-bottom"></div>'+
  '<div class="ark-cinema-tunnel"></div>'+
  '<div class="ark-cinema-speed"></div>'+
  '<div class="ark-cinema-flash"></div>'+
  '<div class="ark-cinema-title"><small data-ark-cinema-kicker>WILD DUEL</small>'+
  '<strong data-ark-cinema-title></strong><span data-ark-cinema-sub></span></div>'+
  '<div class="ark-cinema-charge" aria-hidden="true"></div>'+
  '<div class="ark-cinema-howl-waves" aria-hidden="true"><i></i><i></i><i></i></div>'+
  '<div class="ark-cinema-win-stamp" data-ark-cinema-winner></div>'+
  '<div class="ark-cinema-symbols">'+
  Array.from({length:14},(_,i)=>'<span style="--n:'+i+'"></span>').join('')+'</div>'+
  '<div class="ark-cinema-lock" data-ark-cinema-lock></div>'+
  '<div class="ark-cinema-frame"><span>NOAH’S ARKADE</span><span>WILDLIFE COMBAT · 001</span></div>';
 battlefield.append(overlay);
}
function captureNativeLength(evt){
 const status=window.NoahsArena3D?.getClipDuration?.(evt.attacker,evt.move);
 return Number.isFinite(status)&&status>100?status:undefined;
}
function sync(){
 if(!onBattle()){cleanup();return;}
 const el=ui.querySelector('.combat-battlefield');
 if(!el){cleanup();return;}
 const s=battle(),review=window.NoahsArena3D?.getReviewState?.();
 const event=review?.active?review.event:arena.battleEvent(s);
 if(!event){
   if(sequence){cleanup();}
   return;
 }
 const same=sequence?.event?.key===event.key;
 if(!same){
   if(timer)cancelAnimationFrame(timer);
   sequence={event,started:performance.now(),elapsed:0,done:false,nativeLength:captureNativeLength(event)};
   lastBeat='';lastShot='';howlCued=false;winCued=false;
   // A fresh event should not inherit the previous overlay's move labels
   // or decorative data attributes even if React/DOM reused the stage.
   if(overlay){overlay.dataset.beat='';overlay.dataset.shot='';}
 }
 if(stage!==el||!overlay?.isConnected)createOverlay();
 const panel=ui.querySelector('.ark-reference-layout');
 if(panel){panel.classList.add('ark-cinematic-active');panel.classList.remove('ark-cinematic-done');}
 draw();
}
function cueForBeat(beat){
 if(beat==='CONTACT')window.NoahsAudio?.cue('impact');
 else if(beat==='MIRACLE')window.NoahsAudio?.cue('cinemaMiracle');
 else if(beat==='INTRO')window.NoahsAudio?.cue('cinemaIntro');
 else if(beat==='VICTORY')window.NoahsAudio?.cue('cinemaVictory');
 else if(beat==='REACTION')window.NoahsAudio?.cue('cinemaReaction');
 else if(beat==='FOCUS')window.NoahsAudio?.cue('cinemaFocus');
}
function draw(time){
 timer=0;
 if(!onBattle()||!overlay?.isConnected||!sequence)return;
 const now=time??performance.now();
 const {event}=sequence;
 const length=sequence.nativeLength||captureNativeLength(event);
 sequence.nativeLength=length;
 const timing=api.duration(event,length);
 const review=window.NoahsArena3D?.getReviewState?.();
 const rehearsal=Boolean(review?.active&&review.event?.key===event.key);
 const elapsed=rehearsal?
   Math.min(timing.total,Math.max(0,review.elapsed)):
   reduce()?timing.total:Math.min(timing.total,Math.max(0,now-sequence.started));
 sequence.elapsed=elapsed;
 const panel=api.panel(event,elapsed,length);
 const beat=panel.beat;
 if(lastBeat!==beat){
   lastBeat=beat;
   overlay.dataset.beat=beat.toLowerCase();
   stage.dataset.cineBeat=beat.toLowerCase();
   overlay.dataset.accent=panel.accent;
   overlay.dataset.miracle=panel.miracle||'';
   overlay.dataset.attacker=String(event.attacker);
   const kicker=overlay.querySelector('[data-ark-cinema-kicker]');
   const heading=overlay.querySelector('[data-ark-cinema-title]');
   const sub=overlay.querySelector('[data-ark-cinema-sub]');
   if(kicker)kicker.textContent=rehearsal?'BROWN BEAR · MOTION REVIEW':
     beat==='FOCUS'?'THE SIGNATURE STRIKE':
     beat==='VICTORY'?'BOUT CONQUERED':
      beat==='MIRACLE'?'MIRACLE CARD ACTIVATED':
      beat==='CONTACT'?'THE IMPACT':beat==='REACTION'?'THE AFTERSHOCK':'SIGNATURE MOVE';
   if(heading)heading.textContent=panel.title;
   if(sub)sub.textContent=rehearsal?
     beat==='CONTACT'?'STAGED CONTACT · NO HP CHANGES':
     beat==='REACTION'?'OPPONENT HIT REACTION':
     beat==='FOCUS'?'A MOMENT OF STILLNESS BEFORE IMPACT':
     beat==='VICTORY'?'FOUR CAMERA ANGLES · NATIVE VICTORY CLIP':
     'SIGNATURE ATTACK · REPEATABLE MOVEMENT':panel.sub;
   if(!reduce())cueForBeat(beat);
 }
 const p=api.shot(event,elapsed,length);
 overlay.dataset.shot=p.shot;
 overlay.dataset.move=event.move;
 overlay.dataset.winner=event.attackerId;
 if(lastShot!==p.shot){
   lastShot=p.shot;
   if(!reduce()&&p.beat==='ATTACK'&&(p.shot==='rush'||p.shot==='sweep'))
     window.NoahsAudio?.cue('cinemaRush');
 }
 // A real animal vocal should start when the mouth opens, not at the
 // beginning of the camera's fourth angle. The result appears after the
 // howl so it doesn't drown out the actual celebration.
 const howl=p.beat==='VICTORY'&&event.attackerId==='bear'?
   api.bearHowl(p.local):null;
 overlay.dataset.howlPhase=howl?.phase||'none';
 if(p.beat==='VICTORY'&&!reduce()){
   if(event.attackerId==='bear'&&p.local>=api.VICTORY_HOWL_CUE_MS&&!howlCued){
     window.NoahsAudio?.cue('bearHowl');
     howlCued=true;
   }
   if(p.local>=api.VICTORY_BANNER_MS&&!winCued){
     window.NoahsAudio?.cue('cinemaWin');
     winCued=true;
   }
 }
 const winner=overlay.querySelector('[data-ark-cinema-winner]');
 if(winner)winner.textContent=p.beat==='VICTORY'&&
   p.local>=api.VICTORY_BANNER_MS?
   event.attackerId.toUpperCase()+' WINS!':'';
 const root=ui.querySelector('.ark-reference-layout');
 if(elapsed>=timing.total){
   sequence.done=true;
   // Keep the final winning Bear in view until the user presses Stop.
   // 'done' previously stripped the victory stamp as soon as the review
   // finished, exposing leftover move text instead of the triumphant end.
   const holdWinner=rehearsal&&event.finished;
   if(root){
     root.classList.toggle('ark-cinematic-active',holdWinner);
     root.classList.toggle('ark-cinematic-done',!holdWinner);
   }
   overlay.dataset.beat=holdWinner?'victory':'done';
   if(holdWinner)stage.dataset.cineBeat='victory';
 }else{
   if(root){root.classList.add('ark-cinematic-active');root.classList.remove('ark-cinematic-done');}
 }
 const lock=overlay.querySelector('[data-ark-cinema-lock]');
 if(lock){
   if(slotStamp&&now<stampUntil){lock.textContent=slotStamp;lock.classList.add('ark-is-visible');}
   else lock.classList.remove('ark-is-visible');
 }
 if(!sequence.done&&!document.hidden)timer=requestAnimationFrame(draw);
}
window.addEventListener('arkade:screenchange',sync);
window.addEventListener('arkade:bearreviewchange',sync);
window.addEventListener('arkade:reelstop',e=>{
  const data=e.detail||{};
  const locked=data.value==='MARK'?'✦':String(data.value??'');
  slotStamp=(data.phase==='ATTACK'?'ATTACK':'POWER')+' REEL  ·  '+locked+'  ·  LOCKED';
  stampUntil=performance.now()+420;
  if(onBattle()&&sequence&&overlay?.isConnected)draw();
});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&sequence&&!sequence.done){
   sequence.started=performance.now()-sequence.elapsed;
   if(!timer)timer=requestAnimationFrame(draw);
 }else if(document.hidden&&timer){cancelAnimationFrame(timer);timer=0;}
});
window.NoahsCinematics=Object.freeze({
 getState(){if(!sequence)return null;
   return {event:sequence.event,elapsed:sequence.elapsed,done:sequence.done,
     nativeLength:sequence.nativeLength};
 },
 sync,
 getOverlayState:()=>({active:!!sequence,beat:lastBeat,done:!!sequence?.done})
});
})();
