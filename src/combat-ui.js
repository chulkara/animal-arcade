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
  const REEL_STEP_MS=115;
  const MOVES=Object.freeze({
    tiger:{G:'SHADOW RESOLVE',T:'MOONSTEP',P:'AMBER FANG'},
    lion:{G:'GOLDEN HEART',T:'SUNWARD FEINT',P:'SOVEREIGN ROAR'}
  });
  const animal={
    tiger:{label:'BLUE TIGER',art:'./assets/tiger-illustration.webp'},
    lion:{label:'GOLDEN LION',art:'./assets/lion-illustration.webp'}
  };
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
    if(node)node.textContent=token(values[index]);
    if(prev)prev.textContent=token(values[(index+values.length-1)%values.length]);
    if(next)next.textContent=token(values[(index+1)%values.length]);
  }
  function frame(time){
    if(screen()!=='BATTLE_PLAY'||document.hidden){interval=null;return;}
    const values=activeValues();
    if(!values){interval=null;return;}
    // Derive the reel from elapsed time, not frame count. An overloaded
    // phone cannot silently make the power slot run at a different speed.
    const next=reelOffset+Math.floor(Math.max(0,time-reelStart)/REEL_STEP_MS);
    if(next!==slotIndex){slotIndex=next;updateReel();}
    interval=requestAnimationFrame(frame);
  }
  function syncTimer(){
    stopTimer();
    const s=current();
    if(screen()!=='BATTLE_PLAY'||!s||!['ATTACK','POWER'].includes(s.phase)||document.hidden)return;
    reelOffset=(s.round+s.actor*2+(s.phase==='POWER'?1:0)+s.tieCharge)%activeValues().length;
    reelStart=performance.now();
    slotIndex=reelOffset;
    updateReel();
    interval=requestAnimationFrame(frame);
  }
  function stopSlot(){
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
    if(newHit)window.NoahsAudio?.cue(result.phase==='FINISHED'?'ko':event.special?'special':'impact');
    else if(before==='POWER'&&event?.kind==='TIE')window.NoahsAudio?.cue('tie');
    else window.NoahsAudio?.cue('slot');
    open();
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
    return `<div class="combat-fighter ${feedback}" data-tiger-slot="${i}" data-tiger-id="${f.id}">
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
    const move=MOVES[s.animals[e.attacker].id]?.[e.technique]||e.attackName;
    return `<div class="combat-message" role="status">
      <strong>${actorName(s,e.attacker)} — ${move}${e.special?' ✦ SPECIAL':''}</strong>
      <span>${e.damage} damage dealt to ${actorName(s,e.defender)} · ${e.remainingHp} HP remains
      ${e.charge?' · TIE CHARGE '+e.charge:''}</span>
      ${e.strongBonus||e.miracleBonus?`<span class="combat-card-bonus">CARD BOOST ${e.strongBonus?'+ '+e.strongBonus+' STRONG':''}
        ${e.miracleBonus?'+ '+e.miracleBonus+' MIRACLE':''}</span>`:''}</div>`;
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
    if(s.phase==='RESULT')return `<div class="combat-ready">
      <button type="button" data-combat-next data-initial-focus>NEXT ROUND →</button></div>`;
    const isAttack=s.phase==='ATTACK',action=isAttack?'GREEN':'YELLOW';
    const label=isAttack?'STOP ATTACK SLOT':'STOP POWER SLOT';
    const phaseLabel=isAttack?'CHOOSE FIGHTING STYLE':'DECIDE WHO STRIKES';
    const help=isAttack?'Stop on G (Guts), T (Technique), or P (Power).':
      'Stop on 10–50 or the ✦ fighting mark. Higher power attacks; ties reroll.';
    return `<div class="combat-controls">
      <div class="combat-reel-label">${actorLabel(s)} · ${phaseLabel}</div>
      <div class="combat-reel" aria-label="${isAttack?'Attack':'Power'} slot" data-reel-type="${s.phase}">
        <span class="combat-reel-neighbor" data-combat-prev aria-hidden="true">—</span>
        <span data-combat-current aria-live="off">${token(valueNow())}</span>
        <span class="combat-reel-neighbor" data-combat-next-value aria-hidden="true">—</span>
      </div>
      <button type="button" data-combat-stop data-initial-focus class="combat-stop ${isAttack?'combat-green':'combat-yellow'}">
      <span aria-hidden="true" class="combat-light"></span>${action} — ${label}</button>
      <div class="ark-reel-opponent" aria-label="Other animal's locked slots">
        <span class="ark-reel-opponent-label">${s.mode==='SOLO'?'CPU':'OTHER PLAYER'}</span>
        <span class="ark-reel-opponent-value">${token(isAttack?s.selected[1-s.actor].technique:s.selected[1-s.actor].power)}</span>
        <span class="ark-reel-opponent-caption">${isAttack?'ATTACK REEL':'POWER REEL'}</span>
      </div>
      <p class="combat-instruction" role="status">${help}</p></div>`;
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
        ${s.lastEvent?.kind==='HIT'?
          `<div class="battlefield-impact-flash" aria-hidden="true"></div>
           <div class="battlefield-damage battlefield-damage-${s.lastEvent.defender}" aria-hidden="true">
             −${s.lastEvent.damage}</div>`:''}
      </div>
      ${results(s)}
      ${controls(s)}
      <p class="combat-disclaimer">Original prototype balance. Strong cards boost matching attacks; Miracle cards boost winning ✦ rolls. Exact historical damage values remain under research.</p>
      <div class="combat-footer">
        <span>KEYS: G = GREEN · Y = YELLOW · SPACE = STOP · ESC = BACK</span>
        <button type="button" data-tiger-lab-toggle aria-label="Open experimental 3D tiger motion lab">3D TIGER LAB</button>
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
    if(screen()!=='BATTLE_PLAY'||event.altKey||event.metaKey||event.ctrlKey)return;
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
