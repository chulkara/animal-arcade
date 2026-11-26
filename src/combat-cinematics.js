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
 const filmRoot=ui.querySelector('.ark-reference-layout');if(filmRoot){delete filmRoot.dataset.soloFilm;delete filmRoot.dataset.hpHold;delete filmRoot.dataset.hpKo;}
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
  '<div class="ark-cinema-solo-flash"></div>'+
  '<div class="ark-cinema-solo-title"><small data-ark-solo-rank></small><strong data-ark-solo-name></strong></div>'+
  '<div class="ark-cinema-dmg" data-ark-dmg><b data-ark-dmg-a></b><b data-ark-dmg-b></b></div>'+
  '<div class="ark-cinema-total" data-ark-dmg-total></div>'+
  // comeback / ✦ cut-ins (driven from film time in draw())
  '<div class="ark-falling-star" aria-hidden="true"><i></i></div><div class="ark-xslash" aria-hidden="true"><i></i><i></i></div>'+
  '<div class="ark-hitpops" aria-hidden="true"><b data-ark-hitpop="0"></b><b data-ark-hitpop="1"></b><b data-ark-hitpop="2"></b></div>'+
  '<div class="ark-callin ark-callin-focus" data-ark-callin="focus" aria-hidden="true"><i data-ark-focus-portrait></i><b>FOCUS!!</b></div>'+
  '<div class="ark-callin ark-callin-guard" data-ark-callin="guard" aria-hidden="true"><b>FOCUS GUARD!</b><small></small></div>'+
  '<div class="ark-callin ark-callin-revive" data-ark-callin="revive" aria-hidden="true"><b>RESURRECTION!</b></div>'+
  '<div class="ark-cinema-lines"></div>'+
  '<div class="ark-cinema-streak"></div>'+
  '<div class="ark-cinema-slash"><i></i><i></i><i></i></div>'+
  '<div class="ark-cinema-win-stamp" data-ark-cinema-winner></div>'+
  '<div class="ark-cinema-vic-dark"></div><div class="ark-cinema-outro"></div>'+
  '<div class="ark-cinema-win"><b data-ark-perfect>PERFECT!</b><b data-ark-youwin></b></div>'+
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
function cueForBeat(beat,solo,event){
 if(solo&&beat==='TITLE')return window.NoahsAudio?.cue(event?.attackerId==='bear'?'bearHowl':'cinemaFocus');
 if(solo&&beat==='LAUNCH')return window.NoahsAudio?.cue('cinemaRush');
 if(solo&&(beat==='IMPACT'||beat==='FOCUS'))return;
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
 // One clock: when the 3D arena is filming this event, follow its time so
 // titles, flashes and banners can never drift off the shots (slow frames).
 const film3d=window.NoahsArena3D?.getSequence?.();
 const elapsed=rehearsal?
   Math.min(timing.total,Math.max(0,review.elapsed)):
   reduce()?timing.total:
   film3d?.key===event.key?Math.min(timing.total,Math.max(0,film3d.elapsed)):
   Math.min(timing.total,Math.max(0,now-sequence.started));
 if(film3d?.key===event.key)sequence.started=now-elapsed;
 sequence.elapsed=elapsed;
 // Health holds at its pre-hit value through the clash and the film and
 // drains only when the victim lands (combat-ui renders data-hp-hold).
 // From the title on, the bottom slot HUD stays away until the next turn.
 const hpRoot=ui.querySelector('.ark-reference-layout');
 if(hpRoot&&!rehearsal&&hpRoot.dataset.hitFilm){
   const landAt=timing.landAt??(timing.actionLead+timing.contact);
   // Resurrection: hold → drain to 0 on the landing → hold at 0 → refill as it rises.
   const releaseAt=event.resurrected&&timing.reviveAt?timing.reviveAt:landAt;
   if(elapsed>=releaseAt){delete hpRoot.dataset.hpHold;delete hpRoot.dataset.hpKo;window.__arkHpReleased=event.key;}
   else if(window.__arkHpReleased!==event.key){
     if(event.resurrected&&elapsed>=landAt){delete hpRoot.dataset.hpHold;hpRoot.dataset.hpKo='1';}
     else hpRoot.dataset.hpHold='1';
   }
   if(elapsed>=(timing.titleIn??timing.actionLead))hpRoot.dataset.filmPast='1';
 }
 const panel=api.panel(event,elapsed,length);
 const beat=panel.beat;
 if(lastBeat!==beat){
   lastBeat=beat;
   overlay.dataset.beat=beat.toLowerCase();
   stage.dataset.cineBeat=beat.toLowerCase();
   overlay.dataset.accent=panel.accent;
   overlay.dataset.miracle=panel.miracle||'';
   overlay.dataset.attacker=String(event.attacker);
   overlay.dataset.defender=String(event.defender);
   const kicker=overlay.querySelector('[data-ark-cinema-kicker]');
   const heading=overlay.querySelector('[data-ark-cinema-title]');
   const sub=overlay.querySelector('[data-ark-cinema-sub]');
   if(kicker)kicker.textContent=rehearsal?'BROWN BEAR · MOTION REVIEW':
     beat==='FOCUS'?'THE SIGNATURE STRIKE':
     beat==='VICTORY'?'BOUT CONQUERED':
      beat==='MIRACLE'?'MIRACLE CARD ACTIVATED':
      beat==='CONTACT'?'THE IMPACT':beat==='REACTION'?'THE AFTERSHOCK':'SIGNATURE MOVE';
   if(heading)heading.textContent=panel.title;
   overlay.dataset.solo=panel.solo?'1':'';
   const rank=overlay.querySelector('[data-ark-solo-rank]'),name=overlay.querySelector('[data-ark-solo-name]');
   if(rank)rank.textContent=!panel.solo?'':event.superMiracle?'SUPER MIRACLE!':event.goldChange?'GOLD CHANGE!':api.soloSpec(event).rank;
   overlay.dataset.gold=panel.solo&&event.goldChange?'1':'';
   if(name)name.textContent=panel.solo?panel.title:'';
   if(panel.solo){
     // One number pops where the victim lands; the running total sits in
     // red under the victim's health bar as the HUD returns (reference).
     const dmg=Math.max(0,Math.round(event.damage||event.previewDamage||0))*(api.DISPLAY_SCALE||1);
     const total=overlay.querySelector('[data-ark-dmg-total]');if(total)total.textContent=dmg?String(dmg):'';
     const a=overlay.querySelector('[data-ark-dmg-a]'),b=overlay.querySelector('[data-ark-dmg-b]');
     if(a)a.textContent=dmg?String(dmg):'';if(b)b.textContent='';
     overlay.querySelectorAll('[data-ark-hitpop]').forEach(el=>{el.textContent='';el.dataset.placed='';});
     const portrait=overlay.querySelector('[data-ark-focus-portrait]');
     if(portrait){const src=window.NoahsArena3D?.getPortrait?.(event.defenderId)||
       (event.defenderId==='moose'?'./assets/moose-placeholder.svg':'./assets/bear-placeholder.svg');
       portrait.style.backgroundImage='url("'+src+'")';}
     const guard=overlay.querySelector('[data-ark-callin="guard"] small');
     if(guard)guard.textContent=event.focusGuard?'−'+Math.round((event.guarded||0)*(api.DISPLAY_SCALE||1)):'';
   }
   if(sub)sub.textContent=rehearsal?
     beat==='CONTACT'?'STAGED CONTACT · NO HP CHANGES':
     beat==='REACTION'?'OPPONENT HIT REACTION':
     beat==='FOCUS'?'A MOMENT OF STILLNESS BEFORE IMPACT':
     beat==='VICTORY'?'FOUR CAMERA ANGLES · NATIVE VICTORY CLIP':
     'SIGNATURE ATTACK · REPEATABLE MOVEMENT':panel.sub;
   // A locally supplied Forestfall cutscene already owns its soundtrack.
   // Don't play the generic 3D arena soundtrack on top of its audio.
   if(!reduce()&&!window.NoahsForestfall?.getStatus?.().playing)cueForBeat(beat,panel.solo,event);
 }
 const p=api.shot(event,elapsed,length);
 overlay.dataset.shot=p.shot;
 const solo=api.soloView?api.soloView(event,elapsed,length):null;
 const live=!reduce()&&solo?.active;
 overlay.style.setProperty('--solo-flash',live?solo.flash.toFixed(3):'0');
 overlay.style.setProperty('--solo-burst',live?solo.burst.toFixed(3):'0');
 overlay.style.setProperty('--solo-streak',live?solo.streak.toFixed(3):'0');
 overlay.style.setProperty('--solo-slash',live?solo.slash.toFixed(3):'0');
 overlay.dataset.strike=solo?.strike||'';
 overlay.dataset.pops=solo?.active?String(solo.pops):'0';
 // the red total shows from the landing and clears before the return cut
 // (not in the film review, which has no HUD to sit under)
 overlay.dataset.total=!rehearsal&&solo?.active&&elapsed>=timing.landAt&&elapsed<timing.returnAt?'1':'';
 // Super Miracle: the golden star falls through the strike onto the victim
 // and the blow is a cyan X-slash on it.
 overlay.style.setProperty('--star-u',live?String(solo.star||0):'0');
 overlay.style.setProperty('--star-op',live&&solo.star>0?'1':'0');
 overlay.style.setProperty('--xslash',live?String(solo.xslash||0):'0');
 if(live&&solo.xslash>0){
   const hit=window.NoahsArena3D?.getHitAnchor?.();
   if(hit&&Number.isFinite(hit.x)){overlay.style.setProperty('--hit-x',(hit.x*100).toFixed(1)+'%');overlay.style.setProperty('--hit-y',(hit.y*100).toFixed(1)+'%');}
 }
 // Technique's claw slash is drawn across the victim's body as it is hit.
 if(live&&solo.slash>0){
   const hit=window.NoahsArena3D?.getHitAnchor?.();
   if(hit&&Number.isFinite(hit.x)){overlay.style.setProperty('--hit-x',(hit.x*100).toFixed(1)+'%');overlay.style.setProperty('--hit-y',(hit.y*100).toFixed(1)+'%');}
 }
 // Damage pop, from film time (deterministic, frame-accurate in review):
 // scale .6 → 1.15 → 1 in 180 ms, drift up, fade before the return cut.
 if(solo?.active){
   // Each blow's number pops AT its blow, on the victim, at its own spot:
   // 1st on the contact freeze, 2nd mid-flight (3-hit moves), last on the
   // ground slam. Each floats up 32 px; red total under the HP = their sum.
   const hits=(event.hits?.length?event.hits:[event.damage||event.previewDamage||0]).map(v=>Math.max(0,Math.round(v))*(api.DISPLAY_SCALE||1));
   const n=Math.min(3,hits.length),contactHit=timing.actionLead+timing.contact+20;
   const at=n===1?[timing.landAt]:n===2?[contactHit,timing.landAt]:
     [contactHit,timing.launchAt+.45*(timing.landAt-timing.launchAt),timing.landAt];
   const OFF=n===1?[[0,0]]:n===2?[[-.06,.05],[.04,-.04]]:[[-.07,.05],[.07,-.05],[0,0]];
   const age=elapsed-(timing.landAt||0);
   overlay.querySelectorAll('[data-ark-hitpop]').forEach((el,i)=>{
     if(i>=n||reduce()){el.style.opacity='0';return;}
     const a=elapsed-at[i],last=i===n-1,life=last?(event.resurrected?550:api.SOLO_MS.pop):550;
     if(a<0||a>=life){el.style.opacity='0';if(a<0)el.dataset.placed='';return;}
     if(el.textContent!==String(hits[i]))el.textContent=String(hits[i]);
     // from the second blow on, a hit counter under the number, so two equal
     // numbers in a row read as two hits, not one lingering pop
     el.dataset.n=i>0?(i+1)+' HITS!':'';
     if(a<90||!el.dataset.placed){
       const p=window.NoahsArena3D?.getPopAnchor?.();
       const x=p&&Number.isFinite(p.x)?p.x:(event.defender===1?.7:.3),y=p&&Number.isFinite(p.y)?p.y:.35;
       el.style.left=(Math.min(.9,Math.max(.1,x+OFF[i][0]))*100).toFixed(1)+'%';
       el.style.top=(Math.min(.8,Math.max(.12,y+OFF[i][1]))*100).toFixed(1)+'%';
       if(a>=90)el.dataset.placed='1';
     }
     const sc=a<80?.6+.6*a/80:a<180?1.2-.2*(a-80)/100:1;
     el.style.opacity=String(a<40?a/40:a>life-200?Math.max(0,(life-a)/200):1);
     el.style.transform='translate(-50%,-50%) translateY('+(-32*a/life).toFixed(1)+'px) scale('+sc.toFixed(3)+')';
   });
   overlay.style.setProperty('--pop-op','0');
   // cut-ins, all from film time
   const win=(a,b,fade=120)=>elapsed<a||elapsed>=b?0:Math.min(1,(elapsed-a)/fade,(b-elapsed)/fade);
   const contactAt=timing.actionLead+timing.contact;
   overlay.style.setProperty('--callin-focus',!reduce()&&event.focusGuard?win(contactAt-520,contactAt,70).toFixed(3):'0');
   // with a Resurrection the guard tag clears before the 0-HP hold
   overlay.style.setProperty('--callin-guard',event.focusGuard?win(timing.landAt+120,timing.landAt+(event.resurrected?620:1100)).toFixed(3):'0');
   // one sting per cut-in, the first frame it shows (never in the review)
   if(!rehearsal&&!reduce()){
     const cue=(name,on)=>{if(on&&!sequence['cue_'+name]){sequence['cue_'+name]=true;window.NoahsAudio?.cue(name);}};
     cue('goldChange',event.goldChange&&elapsed>=timing.titleIn+200&&elapsed<timing.actionLead);
     cue('focus',event.focusGuard&&elapsed>=contactAt-520&&elapsed<contactAt);
     cue('focusGuard',event.focusGuard&&elapsed>=timing.landAt+120&&elapsed<timing.returnAt);
     cue('resurrect',event.resurrected&&elapsed>=timing.reviveAt&&elapsed<timing.returnAt);
   }
   overlay.style.setProperty('--callin-revive',event.resurrected?win(timing.reviveAt,Math.min(timing.returnAt,timing.reviveAt+1300)).toFixed(3):'0');
   // where the victim lands: the guard / revive tags sit under it
   const anchor=age>=0&&age<api.SOLO_MS.pop?window.NoahsArena3D?.getPopAnchor?.():null;
   if(anchor&&Number.isFinite(anchor.x)&&Number.isFinite(anchor.y)){
     overlay.style.setProperty('--pop-x',(Math.min(.88,Math.max(.12,anchor.x))*100).toFixed(1)+'%');
     overlay.style.setProperty('--pop-top',(Math.min(.8,Math.max(.15,anchor.y))*100).toFixed(1)+'%');
     overlay.dataset.popAnchored='1';
   }else if(age<0)overlay.dataset.popAnchored='';
 }
 // During the attack film the arena HUD steps away (as in the reference),
 // returning with the HP drain when the film cuts back to the arena.
 const film=(Boolean(solo?.active)&&['TITLE','ATTACK','CONTACT','LAUNCH'].includes(p.beat))||p.beat==='VICTORY';
 const layoutRoot=ui.querySelector('.ark-reference-layout');
 if(layoutRoot){if(film)layoutRoot.dataset.soloFilm='1';else delete layoutRoot.dataset.soloFilm;}
 overlay.dataset.move=event.move;
 overlay.dataset.winner=event.attackerId;
 if(lastShot!==p.shot){
   lastShot=p.shot;
   if(!reduce()&&!window.NoahsForestfall?.getStatus?.().playing&&
      p.beat==='ATTACK'&&(p.shot==='rush'||p.shot==='sweep'))
     window.NoahsAudio?.cue('cinemaRush');
 }
 // A real animal vocal should start when the mouth opens, not at the
 // beginning of the camera's fourth angle. The result appears after the
 // howl so it doesn't drown out the actual celebration.
 const howl=p.beat==='VICTORY'&&event.attackerId==='bear'?
   api.bearHowl(p.local):null;
 overlay.dataset.howlPhase=howl?.phase||'none';
 if(p.beat==='VICTORY'&&!reduce()&&!window.NoahsForestfall?.getStatus?.().playing){
   if(p.local>=api.VICTORY_HOWL_CUE_MS&&!howlCued){
     if(event.attackerId==='moose')window.NoahsAudio?.cue('mooseBellow');
     else window.NoahsAudio?.cue('bearHowl');
     howlCued=true;
   }
   // the Moose bellows again at the top of its rear-up (runtime mooseVictory)
   if(event.attackerId==='moose'&&p.local>=2300+640&&!sequence.rearCued){
     window.NoahsAudio?.cue('mooseBellow');sequence.rearCued=true;
   }
   if(p.local>=api.VICTORY_BANNER_MS&&!winCued){
     window.NoahsAudio?.cue('cinemaWin');
     winCued=true;
   }
 }
 // Reference win: a dark dip, PERFECT! (only if the winner is unhurt)
 // slams in, "You win!" under it, then a sky-coloured outro holds it.
 const vic=p.beat==='VICTORY'?p.local:-1;
 const perfect=Boolean(event.perfect);
 const youAt=perfect?api.VICTORY_BANNER_MS:0;
 const slam=age=>age<0?{s:2,o:0}:age<160?{s:2-1.12*age/160,o:Math.min(1,age/60)}:
   age<240?{s:.88+.12*(age-160)/80,o:1}:{s:1,o:1};
 const pf=slam(perfect?vic:-1),yw=slam(vic>=0?vic-youAt:-1);
 overlay.style.setProperty('--perfect-s',pf.s.toFixed(3));overlay.style.setProperty('--perfect-o',pf.o.toFixed(3));
 overlay.style.setProperty('--youwin-s',yw.s.toFixed(3));overlay.style.setProperty('--youwin-o',yw.o.toFixed(3));
 overlay.style.setProperty('--vic-dark',vic<0?'0':(vic<90?vic/90*.7:Math.max(0,.7-(vic-90)/260*.7)).toFixed(3));
 const cam=p.beat==='VICTORY'?api.camera(event,elapsed,length):null;
 overlay.style.setProperty('--outro',String(cam?.outro||0));
 overlay.dataset.result=vic>=youAt?'visible':'hidden';
 const winner=overlay.querySelector('[data-ark-cinema-winner]');
 if(winner)winner.textContent='';
 const you=overlay.querySelector('[data-ark-youwin]');
 if(you&&vic>=0)you.textContent=event.mode==='DUEL'?'P'+(event.attacker+1)+' wins!':
   event.mode==='SOLO'&&event.attacker!==0?'You lose…':'You win!';
 overlay.dataset.perfect=perfect?'1':'';
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
