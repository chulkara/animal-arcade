/* Independent Phase 3 combat screen, layered over Phase 2. Does not
 * touch the approved painted main menu or Phase 2 original portrait art. */
(function(){
  'use strict';
  const api=window.ArkadeCombatEngine;
  const ui=document.getElementById('ui');
  if(!api||!ui)return;
  let battle=null,slotIndex=0,interval=null;
  const animal={
    tiger:{label:'BLUE TIGER',art:'./assets/tiger-illustration.webp'},
    lion:{label:'GOLDEN LION',art:'./assets/lion-illustration.webp'}
  };
  function current(){return battle?.getState()||null;}
  function screen(){return window.__arkade?.getScreen();}
  function open(){window.__arkade?.openScreen('BATTLE_PLAY');}
  function stopTimer(){if(interval!==null){clearInterval(interval);interval=null;}}
  function start({mode,picks}){
    battle=api.createBattle({mode,picks});
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
    const node=ui.querySelector('[data-combat-current]');
    if(node)node.textContent=token(valueNow());
  }
  function syncTimer(){
    stopTimer();
    const s=current();
    if(screen()!=='BATTLE_PLAY'||!s||!['ATTACK','POWER'].includes(s.phase)||document.hidden)return;
    // Stagger player/round starting positions so immediate clicks do not
    // accidentally lock two identical values every time.
    slotIndex=(s.round+s.actor*2+(s.phase==='POWER'?1:0)+s.tieCharge)%activeValues().length;
    updateReel();
    interval=setInterval(()=>{slotIndex++;updateReel();},115);
  }
  function stopSlot(){
    const s=current();
    if(!s||screen()!=='BATTLE_PLAY'||!['ATTACK','POWER'].includes(s.phase))return;
    const value=valueNow();
    if(value===undefined)return;
    stopTimer();
    battle.stop(value);
    window.NoahsAudio?.cue('confirm');
    open();
  }
  function next(){
    if(current()?.phase!=='RESULT')return;
    battle.nextRound();
    window.NoahsAudio?.cue('move');
    open();
  }
  function rematch(){if(!battle)return;battle.reset();open();}
  function actorLabel(s){return s.mode==='SOLO'&&s.actor===1?'CPU':'PLAYER '+(s.actor+1);}
  function actorName(s,i){return s.mode==='SOLO'&&i===1?'CPU':'PLAYER '+(i+1);}
  function fighter(s,i){
    const f=s.animals[i];
    const a=animal[f.id];
    const selected=s.selected[i];
    return `<div class="combat-fighter">
      <div class="combat-fighter-head"><span>${actorName(s,i)}</span><strong>${f.hp} / ${f.maxHp}</strong></div>
      <div class="combat-hp" role="progressbar" aria-label="${a.label} health" aria-valuemin="0" aria-valuemax="${f.maxHp}" aria-valuenow="${f.hp}">
        <span style="width:${Math.round(100*f.hp/f.maxHp)}%"></span>
      </div>
      <img class="combat-fighter-art" src="${a.art}" alt="" loading="eager">
      <strong class="combat-animal-name">${a.label}</strong>
      <div class="combat-selections"><span>ATTACK <b>${selected.technique||'?'}</b></span><span>POWER <b>${token(selected.power)}</b></span></div>
    </div>`;
  }
  function results(s){
    const e=s.lastEvent;
    if(!e)return '';
    if(e.kind==='TIE')return `<div class="combat-message" role="status"><strong>POWER TIE</strong>
      <span>Reroll the yellow power slot. Tiebreak charge +${e.charge}; no health lost.</span></div>`;
    return `<div class="combat-message" role="status">
      <strong>${actorName(s,e.attacker)} — ${e.attackName}${e.special?' ✦ SPECIAL':''}</strong>
      <span>${e.damage} damage dealt to ${actorName(s,e.defender)} · ${e.remainingHp} HP remains
      ${e.charge?' · TIE CHARGE '+e.charge:''}</span></div>`;
  }
  function controls(s){
    if(s.phase==='FINISHED')return `<div class="combat-finish" role="status">
      <strong>${actorName(s,s.winner)} WINS!</strong><span>${animal[s.animals[s.winner].id].label} stands victorious.</span>
      <button type="button" data-combat-rematch data-initial-focus>REMATCH</button></div>`;
    if(s.phase==='RESULT')return `<div class="combat-ready">
      <button type="button" data-combat-next data-initial-focus>NEXT ROUND →</button></div>`;
    const isAttack=s.phase==='ATTACK',action=isAttack?'GREEN':'YELLOW';
    const label=isAttack?'STOP ATTACK SLOT':'STOP POWER SLOT';
    const phaseLabel=isAttack?'CHOOSE FIGHTING STYLE':'DECIDE WHO STRIKES';
    const help=isAttack?'Stop on G (Guts), T (Technique), or P (Power).':
      'Stop on 10–50 or the ✦ fighting mark. Higher power attacks; ties reroll.';
    return `<div class="combat-controls">
      <div class="combat-reel-label">${actorLabel(s)} · ${phaseLabel}</div>
      <div class="combat-reel" aria-label="${isAttack?'Attack':'Power'} slot">
        <span class="combat-reel-side" aria-hidden="true">◀</span>
        <span data-combat-current aria-live="off">${token(valueNow())}</span>
        <span class="combat-reel-side" aria-hidden="true">▶</span>
      </div>
      <button type="button" data-combat-stop data-initial-focus class="combat-stop ${isAttack?'combat-green':'combat-yellow'}">
      <span aria-hidden="true" class="combat-light"></span>${action} — ${label}</button>
      <p class="combat-instruction">${help}</p></div>`;
  }
  function render(){
    const s=current();
    if(!s)return `<section class="panel combat-panel"><h1>BATTLE UNAVAILABLE</h1>
      <button type="button" data-combat-quit>← RETURN TO ARENA</button></section>`;
    return `<section class="panel combat-panel screen-copy" aria-label="Interactive animal battle">
      <div class="section-eyebrow">NOAH'S ARKADE · COMBAT LAB</div>
      <div class="combat-heading"><h1 class="panel-title">WILD DUEL</h1>
        <span>ROUND ${s.round} · ${s.mode==='SOLO'?'SOLO VS CPU':'LOCAL 2 PLAYERS'}</span></div>
      <div class="combat-match">
        ${fighter(s,0)}
        <div class="combat-versus" aria-hidden="true">VS</div>
        ${fighter(s,1)}
      </div>
      ${results(s)}
      ${controls(s)}
      <p class="combat-disclaimer">Playable original-prototype rules. Card modifiers, Miracle Cards, and exact historical damage values are not implemented.</p>
      <div class="combat-footer">
        <span>KEYS: G = GREEN · Y = YELLOW · SPACE = STOP · ESC = BACK</span>
        <button type="button" data-combat-quit>← BACK TO ARENA</button>
      </div>
    </section>`;
  }
  ui.addEventListener('click',event=>{
    const target=event.target;
    if(target.closest('[data-combat-stop]')){stopSlot();return;}
    if(target.closest('[data-combat-next]')){next();return;}
    if(target.closest('[data-combat-rematch]')){rematch();return;}
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
  window.NoahsCombat={start,render,getState:current,stopSlot,next,rematch};
})();
