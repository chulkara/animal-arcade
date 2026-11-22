/* Independent Phase 3 combat screen, layered over Phase 2. Does not
 * touch the approved painted main menu or Phase 2 original portrait art. */
(function(){
  'use strict';
  const api=window.ArkadeCombatEngine;
  const matchApi=window.ArkadeMatch;
  const ui=document.getElementById('ui');
  if(!api||!matchApi||!ui)return;
  let battle=null,slotIndex=0,interval=null,matchReward=null,rewardClaimed=false;
  let reelStart=0,reelOffset=0;
  const REEL_STEP_MS=96;
  // Arcade flow: a countdown stops the reel for you, and after a hit plays out the
  // next exchange starts by itself (Enter / click skips ahead).
  const COUNTDOWN_MS=10000;
  const ADVANCE_MIN_MS=1300;   // never jump on before the hit has been seen
  const ADVANCE_MAX_MS=10500;  // safety cap if a cinematic never reports done
  const RESULT_HOLD_MS=1600;   // after the cinematic, the result line stays up this long
  let countdownKey='',countdownLeft=COUNTDOWN_MS,countdownAt=0,lastShownSecond=-1;
  let advanceTimer=0,advanceKey='',advanceSince=0,filmDoneAt=0;
  const animal=window.NoahsRoster.ANIMALS;
  const MOVES=Object.freeze(Object.fromEntries(window.NoahsRoster.ids.map(
    id=>[id,animal[id].moves])));
  function current(){return battle?.getState()||null;}
  function screen(){return window.__arkade?.getScreen();}
  function open(){window.__arkade?.openScreen('BATTLE_PLAY');}
  function stopTimer(){
    if(interval!==null){cancelAnimationFrame(interval);interval=null;}
  }
  function start({mode,picks}){
    const modifiers=picks.map((animalId,i)=>
      mode==='SOLO'&&i===1?{}:(window.NoahsCards?.getModifiers(i,animalId)||{}));
    battle=matchApi.createMatch({mode,picks,modifiers});
    matchReward=null;rewardClaimed=false;
    slotIndex=0;
    open();
  }
  function activeValues(){
    const s=current();
    return s?.phase==='ATTACK'?api.TECHNIQUES:api.POWERS;
  }
  function valueNow(){return activeValues()?.[slotIndex%activeValues().length];}
  function token(value){
    return value==='MARK'?'✦':String(value??'—');
  }
  function updateReel(){
    const values=activeValues();
    if(!values)return;
    const index=slotIndex%values.length;
    const node=ui.querySelector('[data-combat-current]');
    const prev=ui.querySelector('[data-combat-prev]');
    const next=ui.querySelector('[data-combat-next-value]');
    if(node){
      node.textContent=token(values[index]);
      node.dataset.mark=values[index]==='MARK'?'true':'false';
      node.classList.remove('ark-reel-tick');
      if(!window.__arkade?.getSettings()?.reducedMotion &&
         !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        void node.offsetWidth;
        node.classList.add('ark-reel-tick');
      }
    }
    if(prev)prev.textContent=token(values[(index+values.length-1)%values.length]);
    if(next)next.textContent=token(values[(index+1)%values.length]);
  }
  function paused(){
    // Never run the clock or advance while the player is in a setup dialog,
    // a non-scoring film review, or the Forestfall movie.
    return Boolean(document.querySelector('.ark-fbx-dialog:not([hidden])')||
      window.NoahsArena3D?.getReviewState?.()?.active||
      window.NoahsForestfall?.getStatus?.()?.playing||document.hidden);
  }
  function countdownStateKey(s){return [s.session?.bout,s.round,s.phase,s.actor,s.tieCharge].join(':');}
  function updateCountdown(now){
    const s=current();
    const node=ui.querySelector('[data-combat-countdown]');
    if(!s||!['ATTACK','POWER'].includes(s.phase)){if(node)node.hidden=true;return false;}
    const key=countdownStateKey(s);
    if(key!==countdownKey){countdownKey=key;countdownLeft=COUNTDOWN_MS;countdownAt=now;lastShownSecond=-1;}
    if(paused()){countdownAt=now;}
    else{countdownLeft-=Math.max(0,now-countdownAt);countdownAt=now;}
    const secs=Math.max(0,Math.ceil(countdownLeft/1000));
    if(node){
      node.hidden=false;
      if(secs!==lastShownSecond){
        lastShownSecond=secs;
        node.querySelector('b').textContent=String(secs);
        node.dataset.urgent=secs<=3?'true':'false';
        node.style.setProperty('--left',String(Math.max(0,countdownLeft/COUNTDOWN_MS)));
        if(secs<=3&&secs>0)window.NoahsAudio?.cue('reelTick');
      }else node.style.setProperty('--left',String(Math.max(0,countdownLeft/COUNTDOWN_MS)));
    }
    if(countdownLeft<=0){countdownKey='';stopSlot();return true;}
    return false;
  }
  function scheduleAdvance(){
    const s=current();
    if(!s||s.phase!=='RESULT'||screen()!=='BATTLE_PLAY'){advanceKey='';return;}
    const key=countdownStateKey(s);
    if(advanceKey!==key){advanceKey=key;advanceSince=performance.now();filmDoneAt=0;}
    if(advanceTimer)return;
    const tick=()=>{
      advanceTimer=0;
      const st=current();
      if(!st||st.phase!=='RESULT'||screen()!=='BATTLE_PLAY'||countdownStateKey(st)!==advanceKey){advanceKey='';return;}
      const waited=performance.now()-advanceSince;
      const cine=window.NoahsCinematics?.getState?.();
      const filmDone=!cine||cine.done;
      if(filmDone&&!filmDoneAt)filmDoneAt=performance.now();
      const held=filmDoneAt?performance.now()-filmDoneAt:0;
      if(paused()){advanceSince=performance.now()-Math.min(waited,ADVANCE_MIN_MS);if(filmDoneAt)filmDoneAt=performance.now();}
      else if((filmDone&&held>=RESULT_HOLD_MS&&waited>=ADVANCE_MIN_MS)||waited>=ADVANCE_MAX_MS){next();return;}
      advanceTimer=window.setTimeout(tick,120);
    };
    advanceTimer=window.setTimeout(tick,120);
  }
  function frame(time){
    if(screen()!=='BATTLE_PLAY'||document.hidden){interval=null;return;}
    const values=activeValues();
    if(!values){interval=null;return;}
    // Derive the reel from elapsed time, not frame count. An overloaded
    // phone cannot silently make the power slot run at a different speed.
    const next=reelOffset+Math.floor(Math.max(0,time-reelStart)/REEL_STEP_MS);
    if(next!==slotIndex){
      slotIndex=next;updateReel();
      // A gentle cabinet ratchet every third step, not an exhausting beep
      // on every frame. Audio still respects the user's mute/SFX settings.
      if(next%3===0)window.NoahsAudio?.cue('reelTick');
    }
    if(updateCountdown(time))return;
    interval=requestAnimationFrame(frame);
  }
  function syncTimer(){
    stopTimer();
    scheduleAdvance();
    const s=current();
    if(screen()!=='BATTLE_PLAY'||!s||!['ATTACK','POWER'].includes(s.phase)||document.hidden)return;
    reelOffset=(s.round+s.actor*2+(s.phase==='POWER'?1:0)+s.tieCharge)%activeValues().length;
    reelStart=performance.now();
    slotIndex=reelOffset;
    updateReel();
    updateCountdown(reelStart);
    interval=requestAnimationFrame(frame);
  }
  function stopSlot(){
    // Film rehearsal is intentionally separate from the scored slot battle.
    if(window.NoahsArena3D?.getReviewState?.()?.active)return;
    const s=current();
    if(!s||screen()!=='BATTLE_PLAY'||!['ATTACK','POWER'].includes(s.phase))return;
    const value=valueNow();
    if(value===undefined)return;
    stopTimer();
    const before=s.phase;
    const result=battle.stop(value);
    const event=result.lastEvent;
    const newHit=event?.kind==='HIT'&&
      (before==='POWER'&&result.phase!=='POWER');
    if(newHit)window.NoahsAudio?.cue('cinemaIntro');
    else if(before==='POWER'&&event?.kind==='TIE')window.NoahsAudio?.cue('tie');
    else window.NoahsAudio?.cue('arcadeStop');
    open();
    window.dispatchEvent(new CustomEvent('arkade:reelstop',{
      detail:{phase:before,value,actor:s.actor,round:s.round,hit:newHit}
    }));
    const snap=ui.querySelector('.combat-controls')||ui.querySelector('.combat-battlefield');
    if(snap){
      const flash=document.createElement('div');
      flash.className='ark-reel-snap';
      flash.textContent=(before==='ATTACK'?'ATTACK':'POWER')+'  '+token(value)+'  LOCKED';
      flash.setAttribute('aria-hidden','true');snap.append(flash);
      window.setTimeout(()=>flash.remove(),520);
    }
  }
  function next(){
    if(current()?.phase!=='RESULT')return;
    battle.nextRound();
    window.NoahsAudio?.cue('move');
    open();
  }
  function nextBout(){
    if(current()?.phase!=='FINISHED'||current()?.session.complete)return;
    battle.nextBout();
    window.NoahsAudio?.cue('reveal');
    open();
  }
  function rematch(){
    if(!battle)return;
    matchReward=null;rewardClaimed=false;battle.reset();open();
  }
  function actorLabel(s){return s.mode==='SOLO'&&s.actor===1?'CPU':'PLAYER '+(s.actor+1);}
  function actorName(s,i){return s.mode==='SOLO'&&i===1?'CPU':'PLAYER '+(i+1);}
  function hud(s,i){
    const f=s.animals[i],a=animal[f.id];
    const remaining=Math.round(f.hp/f.maxHp*100);
    return `<div class="ark-arena-hud-player ark-arena-hud-player-${i}" aria-label="${actorName(s,i)} ${a.label}, ${f.hp} of ${f.maxHp} health">
      <div class="ark-hud-nameplate">
        <span class="ark-hud-side">${actorName(s,i)}</span>
        <strong>${a.label}</strong>
        <span class="ark-hud-health-value">${f.hp} / ${f.maxHp}</span>
      </div>
      <div class="ark-hud-meter" aria-hidden="true"><span style="width:${remaining}%"></span></div>
      <div class="ark-hud-techniques" aria-hidden="true">
        <span>G ${s.selected[i].technique==='G'?'◆':'·'}</span>
        <span>T ${s.selected[i].technique==='T'?'◆':'·'}</span>
        <span>P ${s.selected[i].technique==='P'?'◆':'·'}</span>
        <span>${s.selected[i].power==='MARK'?'✦':token(s.selected[i].power)}</span>
      </div>
    </div>`;
  }
  function arenaHUD(s){
    return `<header class="ark-arena-hud" aria-label="Battle status">
      ${hud(s,0)}
      <div class="ark-arena-hud-center" aria-label="Bout ${s.session.bout}, exchange ${s.round}">
        <span>NOAH'S ARKADE</span>
        <b>BOUT ${s.session.bout}</b>
        <small>EXCHANGE ${s.round}</small>
      </div>
      ${hud(s,1)}
    </header>`;
  }
  function fighter(s,i){
    const f=s.animals[i];
    const a=animal[f.id];
    const selected=s.selected[i];
    const hit=s.lastEvent?.kind==='HIT'&&['RESULT','FINISHED'].includes(s.phase)?
      s.lastEvent:null;
    const feedback=hit?(hit.attacker===i?'combat-striker':'combat-struck'):'';
    const motion=window.NoahsRoster.motionFor(f.id,
      !hit?{reaction:'idle'}:hit.attacker===i?
        {technique:hit.technique,special:hit.special}:
        {reaction:f.hp===0?'knockout':'hit'});
    return `<div class="combat-fighter ${feedback}" data-animal-id="${f.id}"
      data-motion="${motion.id}" data-motion-kind="${motion.kind}"
      data-motion-source="${motion.file||motion.move}">
      <div class="combat-fighter-head"><span>${actorName(s,i)}</span><strong>${f.hp} / ${f.maxHp}</strong></div>
      <div class="combat-hp" role="progressbar" aria-label="${a.label} health" aria-valuemin="0" aria-valuemax="${f.maxHp}" aria-valuenow="${f.hp}">
        <span style="width:${Math.round(100*f.hp/f.maxHp)}%"></span>
      </div>
      <img class="combat-fighter-art" src="${a.art}" alt="" loading="eager">
      <strong class="combat-animal-name">${a.label}</strong>
      <div class="combat-selections"><span>ATTACK <b>${selected.technique||'?'}</b></span><span>POWER <b>${token(selected.power)}</b></span></div>
      <div class="combat-card-loadout">
        <span>STRONG: ${s.modifiers?.[i]?.strongName||'NONE'}</span>
        <span>MIRACLE: ${s.modifiers?.[i]?.miracleName||'NONE'}</span>
      </div>
    </div>`;
  }
  function results(s){
    const e=s.lastEvent;
    if(!e)return '';
    if(e.kind==='TIE')return `<div class="combat-message" role="status"><strong>POWER TIE</strong>
      <span>Reroll the yellow power slot. Tiebreak charge +${e.charge}; no health lost.</span></div>`;
    const move=MOVES[s.animals[e.attacker].id]?.[e.special?'S':e.technique]||e.attackName;
    return `<div class="combat-message" role="status">
      <strong>${actorName(s,e.attacker)} — ${move}${e.special?' ✦ SPECIAL':''}</strong>
      <span>${e.damage} damage dealt to ${actorName(s,e.defender)} · ${e.remainingHp} HP remains
      ${e.charge?' · TIE CHARGE '+e.charge:''}</span>
      ${e.strongBonus||e.miracleBonus?`<span class="combat-card-bonus">CARD BOOST ${e.strongBonus?'+ '+e.strongBonus+' STRONG':''}
        ${e.miracleBonus?'+ '+e.miracleBonus+' MIRACLE':''}</span>`:''}</div>`;
  }
  // ── Fight deck: both players' attack + power slots, always on screen ──
  const TECH_LABEL={G:'GUTS',T:'TECHNIQUE',P:'POWER'};
  function slot(s,i,type){
    const sel=s.selected[i],val=type==='ATTACK'?sel.technique:sel.power;
    const live=s.phase===type&&s.actor===i&&val===null&&!(s.mode==='SOLO'&&i===1);
    const kind=type==='ATTACK'?'attack':'power';
    const cap=type==='ATTACK'?'ATTACK':'POWER';
    if(live)return `<div class="combat-reel fight-slot fight-slot-${kind} is-live" aria-label="${type==='ATTACK'?'Attack':'Power'} slot" data-reel-type="${s.phase}">
        <span class="combat-reel-neighbor" data-combat-prev aria-hidden="true">—</span>
        <span data-combat-current aria-live="off">${token(valueNow())}</span>
        <span class="combat-reel-neighbor" data-combat-next-value aria-hidden="true">—</span>
        <div class="ark-reel-lamps" aria-hidden="true">${Array.from({length:8},(_,k)=>'<i style="--lamp:'+k+'"></i>').join('')}</div>
        <em class="fight-slot-cap">${cap}</em></div>`;
    if(val!==null&&val!==undefined)return `<div class="fight-slot fight-slot-${kind} is-locked" data-value="${val}">
        <b>${token(val)}</b><em class="fight-slot-cap">${type==='ATTACK'?TECH_LABEL[val]:cap}</em></div>`;
    // The other side's reel is spinning while this phase is open (CPU or the waiting player).
    if(s.phase===type){
      const strip=(type==='ATTACK'?api.TECHNIQUES:api.POWERS).map(token);
      return `<div class="fight-slot fight-slot-${kind} is-spinning" aria-hidden="true">
        <span class="fight-strip">${[...strip,...strip].map(v=>`<i>${v}</i>`).join('')}</span><em class="fight-slot-cap">${cap}</em></div>`;
    }
    return `<div class="fight-slot fight-slot-${kind} is-empty" aria-hidden="true"><em class="fight-slot-cap">${cap}</em></div>`;
  }
  function side(s,i){
    return `<div class="fight-side fight-side-${i}${i===1?' ark-reel-opponent':''}${s.actor===i&&['ATTACK','POWER'].includes(s.phase)?' is-active':''}" aria-label="${actorName(s,i)} slots">
      <span class="fight-side-name">${actorName(s,i)}</span>
      ${slot(s,i,'ATTACK')}${slot(s,i,'POWER')}</div>`;
  }
  function controls(s){
    if(s.phase==='FINISHED'){
      const complete=s.session.complete;
      const winLabel=complete?
        (s.session.result==='CLEARED'?'THREE-VICTORY RUN COMPLETE':
          s.session.result==='DEFEATED'?'ARCADE RUN OVER':'MATCH WINNER'):
        'BOUT COMPLETE';
      return `<div class="combat-finish" role="status">
        <strong>${winLabel}</strong>
        <span>${actorName(s,s.winner)} — ${animal[s.animals[s.winner].id].label} is victorious.</span>
        ${complete?
          `${matchReward?`<p class="combat-card-reward">MATCH REWARD — ${matchReward.newCard?'NEW CARD':'DUPLICATE'}:
          <strong>${matchReward.name}</strong> ${matchReward.newCard?'UNLOCKED':'×'+matchReward.count}</p>`:''}
          <button type="button" data-combat-rematch data-initial-focus>NEW MATCH</button>
          <button type="button" data-combat-view-cards>VIEW MY CARDS</button>`:
          `<p class="combat-intermission">${s.mode==='SOLO'?
             'Your remaining health carries into the next challenger.':
             'Both fighters recover fully before the next bout.'}</p>
           <button type="button" data-combat-next-bout data-initial-focus>NEXT BOUT →</button>`}
      </div>`;
    }
    const isAttack=s.phase==='ATTACK',isPower=s.phase==='POWER',result=s.phase==='RESULT';
    const phaseLabel=result?'THE STRIKE LANDS':isAttack?'CHOOSE FIGHTING STYLE':'DECIDE WHO STRIKES';
    const help=result?'The next exchange starts automatically. Press Enter to skip ahead.':
      isAttack?'Stop on G (Guts), T (Technique), or P (Power).':
      'Stop on 10–50 or the ✦ fighting mark. Higher power attacks; ties reroll.';
    const center=result?
      `<button type="button" data-combat-next data-initial-focus class="fight-skip">NEXT ▶</button>`:
      `<div class="fight-countdown" data-combat-countdown aria-label="Time left"><b>${Math.ceil(COUNTDOWN_MS/1000)}</b></div>
       <button type="button" data-combat-stop data-initial-focus class="combat-stop ${isAttack?'combat-green':'combat-yellow'}">
        <span aria-hidden="true" class="combat-light"></span>${isAttack?'GREEN — STOP ATTACK SLOT':'YELLOW — STOP POWER SLOT'}</button>`;
    return `<div class="combat-controls fight-deck" data-phase="${s.phase}">
      <div class="combat-reel-label">${result?phaseLabel:actorLabel(s)+' · '+phaseLabel}</div>
      ${side(s,0)}
      <div class="fight-center">${center}</div>
      ${side(s,1)}
      <p class="combat-instruction" role="status">${help}</p></div>`;
  }
  // ── Big arcade callouts over the arena ──
  function callouts(s){
    const e=s.lastEvent;
    const out=[];
    if(s.phase==='ATTACK'&&s.selected.every(x=>x.technique===null)){
      out.push(s.round===1?
        `<div class="fight-callout fight-callout-fight" aria-hidden="true"><small>BOUT ${s.session.bout}</small><b>FIGHT!</b></div>`:
        `<div class="fight-callout fight-callout-small" aria-hidden="true"><b>SET YOUR ATTACK!</b></div>`);
    }
    if(s.phase==='POWER'&&e?.kind==='TIE'){
      const [a,b]=(e.powers||[]).map(token);
      if(a!==undefined)out.push(`<div class="fight-clash is-tie" aria-hidden="true"><span class="fight-clash-l">${a}</span><span class="fight-clash-r">${b}</span></div>`);
      out.push(`<div class="fight-callout fight-callout-tie" aria-hidden="true"><b>TIEBREAKER</b><small>CHARGE ×${e.charge}</small></div>`);
    }else if(s.phase==='POWER'&&s.selected.every(x=>x.power===null)){
      out.push(`<div class="fight-callout fight-callout-small" aria-hidden="true"><b>POWER UP!</b></div>`);
    }
    if(['RESULT','FINISHED'].includes(s.phase)&&e?.kind==='HIT'){
      const p=s.selected.map(x=>token(x.power));
      out.push(`<div class="fight-clash" data-winner="${e.attacker}" aria-hidden="true"><span class="fight-clash-l">${p[0]}</span><span class="fight-clash-r">${p[1]}</span></div>`);
    }
    return out.join('');
  }
  function render(){
    const s=current();
    if(!s)return `<section class="panel combat-panel"><h1>BATTLE UNAVAILABLE</h1>
      <button type="button" data-combat-quit>← RETURN TO ARENA</button></section>`;
    if(s.phase==='FINISHED'&&s.session.complete&&!rewardClaimed){
      rewardClaimed=true;matchReward=window.NoahsCards?.grantBattleReward()||null;
    }
    return `<section class="panel combat-panel ark-reference-layout screen-copy" aria-label="Interactive animal battle">
      <div class="section-eyebrow">NOAH'S ARKADE · COMBAT LAB</div>
      <div class="combat-heading"><h1 class="panel-title">WILD DUEL</h1>
        <span>${s.mode==='SOLO'?
          `BOUT ${s.session.bout} / ${s.session.goal}`:
          `BOUT ${s.session.bout} · FIRST TO ${s.session.goal}`}
          · EXCHANGE ${s.round}</span></div>
      ${arenaHUD(s)}
      <div class="combat-series" aria-label="Arcade match score">
        <span>${s.mode==='SOLO'?'EXPEDITION WINS':'PLAYER 1 WINS'}:
          <b>${s.session.wins[0]} / ${s.session.goal}</b></span>
        <span>${s.mode==='SOLO'?'CPU CHALLENGES':'PLAYER 2 WINS'}:
          <b>${s.session.wins[1]}${s.mode==='DUEL'?' / '+s.session.goal:''}</b></span>
      </div>
      <div class="combat-battlefield ${s.lastEvent?.kind==='HIT'?'battlefield-impact':''} ${s.lastEvent?.special?'battlefield-special':''}" aria-label="Illustrated wild arena">
        <div class="battlefield-sun" aria-hidden="true"></div>
        <div class="battlefield-ridge battlefield-ridge-far" aria-hidden="true"></div>
        <div class="battlefield-ridge battlefield-ridge-near" aria-hidden="true"></div>
        <div class="battlefield-ground" aria-hidden="true"></div>
        <div class="combat-match">
          ${fighter(s,0)}
          <div class="combat-versus" aria-hidden="true">VS</div>
          ${fighter(s,1)}
        </div>
        ${callouts(s)}
        ${s.lastEvent?.kind==='HIT'?
          `<div class="battlefield-impact-flash" aria-hidden="true"></div>
           <div class="battlefield-damage battlefield-damage-${s.lastEvent.defender}" aria-hidden="true">
             −${s.lastEvent.damage}</div>`:''}
      </div>
      ${results(s)}
      ${controls(s)}
      <p class="combat-disclaimer">Original prototype combat tuning. Private FBX creatures render only after local import; battles remain playable with the illustrated fallback.</p>
      <div class="combat-footer">
        <span>KEYS: G = GREEN · Y = YELLOW · SPACE = STOP · ESC = BACK</span>
        <button type="button" data-bear-review-quick>BEAR CINEMATIC REVIEW</button>
        <div class="ark-forestfall-import" aria-label="Forestfall special move video">
          <button type="button" data-forestfall-choose>LOAD FORESTFALL VIDEO</button>
          <input type="file" data-forestfall-file accept=".mp4,.webm,video/mp4,video/webm" hidden>
          <button type="button" data-forestfall-preview disabled>PREVIEW FORESTFALL</button>
          <small data-forestfall-status>Choose the 1080p Forestfall MP4. Stored only for this session.</small>
        </div>
        <button type="button" data-ark3d-open>3D ARENA SETUP</button>
        <button type="button" data-combat-quit>← BACK TO ARENA</button>
      </div>
    </section>`;
  }
  ui.addEventListener('click',event=>{
    const target=event.target;
    if(target.closest('[data-combat-stop]')){stopSlot();return;}
    if(target.closest('[data-combat-next]')){next();return;}
    if(target.closest('[data-combat-next-bout]')){nextBout();return;}
    if(target.closest('[data-combat-rematch]')){rematch();return;}
    if(target.closest('[data-combat-view-cards]')){
      stopTimer();window.NoahsCards?.open('CARDS');return;
    }
    if(target.closest('[data-combat-quit]')){stopTimer();window.__arkade?.openScreen('BATTLE_STAGE');}
  });
  window.addEventListener('keydown',event=>{
    if(screen()!=='BATTLE_PLAY'||event.altKey||event.metaKey||event.ctrlKey||
      window.NoahsArena3D?.getReviewState?.()?.active)return;
    const tag=event.target?.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA')return;
    const state=current();
    const isAttack=state?.phase==='ATTACK';
    const isPower=state?.phase==='POWER';
    if((isAttack&&event.key.toLowerCase()==='g')||
       (isPower&&event.key.toLowerCase()==='y')||
       ((isAttack||isPower)&&event.key===' ')){
      event.preventDefault();event.stopImmediatePropagation();stopSlot();
    }
  },true);
  window.addEventListener('arkade:screenchange',syncTimer);
  document.addEventListener('visibilitychange',syncTimer);
  window.NoahsCombat={start,render,getState:current,stopSlot,next,nextBout,rematch};
})();
