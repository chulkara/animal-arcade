/* Noah's Arkade Phase 4 collection + binder. Persist only to this browser.
 * Never implies cloud saves, real money, or an online account. */
(function(){
  'use strict';
  const core=window.ArkadeCardsCore,ui=document.getElementById('ui');
  if(!core||!ui)return;
  // Some private browsing contexts throw when accessing localStorage itself.
  // The collection must still work in memory rather than taking down the menu.
  let localStore=null;
  try{localStore=window.localStorage;}catch{}
  const store=core.createStore(localStore);
  const screen=()=>window.__arkade?.getScreen();
  let filter='all',side='p1',message='',showBackup=false,importText='';
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const typeLabel=type=>type==='animal'?'ANIMAL':type==='strong'?'STRONG':'MIRACLE';
  const typeHelp=type=>type==='animal'?'Your fighter and its G / T / P levels':
    type==='strong'?'Boosts one attack, plus its own effect':'✦ damage, plus a special effect on animals it fits';
  const TECH=Object.freeze({G:'GUTS',T:'TECHNIQUE',P:'POWER'});
  const animalName=id=>core.BY_ID['animal:'+id]?.name||id.toUpperCase();
  const shortName=id=>({bear:'BEAR',moose:'MOOSE',shark:'SHARK'}[id]||id.toUpperCase());
  // G/T/P levels as five pips each (Animal cards)
  function levels(card){
    return `<dl class="ark-card-levels" aria-label="Attack levels">${['G','T','P'].map(t=>
      `<div data-tech="${t}"><dt title="${TECH[t]}">${t}</dt><dd aria-label="${TECH[t]} level ${card.stats[t]} of 5">${
        Array.from({length:5},(_,i)=>`<i${i<card.stats[t]?' class="on"':''}></i>`).join('')}</dd></div>`).join('')}</dl>`;
  }
  // Miracle compatibility: which animals it fits, and whether it fits the
  // animal in this loadout (it still adds ✦ damage when it does not)
  function fitLine(card,deck){
    if(card.type!=='miracle')return '';
    const all=card.fits.length>=3;
    const who=all?'EVERY ANIMAL':card.fits.map(shortName).join(' · ');
    if(!deck)return `<p class="ark-card-fit">FITS ${who}</p>`;
    const id=core.BY_ID[deck.animal]?.animalId;
    const ok=core.fits(card,id);
    return `<p class="ark-card-fit" data-fit="${ok}">${ok?'✓ FITS '+(all?who:shortName(id)):'✦ DAMAGE ONLY ON '+shortName(id)+' · FITS '+who}</p>`;
  }
  function rules(card){
    if(card.type==='animal')return levels(card);
    return `<ul class="ark-card-rules">${card.rules.map(r=>`<li>${escape(r)}</li>`).join('')}</ul>`;
  }
  function open(view='CARDS'){
    filter='all';message='';showBackup=false;importText='';
    window.__arkade?.openScreen(view==='BINDER'?'BINDER':'CARDS');
  }
  function refresh(){const current=screen();if(['CARDS','BINDER'].includes(current))openScreen(current);}
  function openScreen(which){window.__arkade?.openScreen(which);}
  // Rare finishes on Animal cards (cosmetic): chips to wear one, and the
  // card face drawn in it. The binder shows the finish the side wears.
  const FINISH=Object.fromEntries(core.FINISHES.map(f=>[f.id,f]));
  function finishChips(card,s,deck){
    if(card.type!=='animal')return '';
    const owned=s.finishes?.[card.id]||[];
    const worn=deck&&deck.animal===card.id?deck.finish||'standard':null;
    return `<div class="ark-finishes" role="group" aria-label="${card.name} finishes, ${owned.length} of 3 found">
      <span>FINISHES ${owned.length}/3</span>
      ${core.FINISH_IDS.map(f=>{
        const have=f==='standard'||owned.includes(f);
        const label=have?FINISH[f].name:'???';
        if(!deck||!have)return `<i data-finish-chip="${f}" data-have="${have}" title="${have?FINISH[f].note:'Not found yet'}">${label}</i>`;
        return `<button type="button" data-card-finish="${f}" data-card-for="${card.id}" aria-pressed="${worn===f}" title="${FINISH[f].note}">${label}</button>`;
      }).join('')}
    </div>`;
  }
  function cardFace(card,owned,finish='standard'){
    if(!owned)return `<div class="ark-card-face ark-locked" aria-label="Locked card">
      <span class="ark-card-ornament">✦ ◈ ✦</span><span class="ark-card-mystery">?</span>
      <span class="ark-card-face-foot">UNRECOVERED</span></div>`;
    // Strong cards carry their attack's emblem (the reel's octagon), Miracle
    // cards a ✦ seal, both tinted by technique / affinity
    const emblem=card.type==='strong'?`<b class="ark-card-emblem" aria-hidden="true">${card.technique}</b>`:
      card.type==='miracle'?'<b class="ark-card-emblem" aria-hidden="true">✦</b>':'';
    const fin=card.type==='animal'&&finish!=='standard'?finish:'';
    return `<div class="ark-card-face ark-${card.type}" data-tech="${card.technique||''}" data-affinity="${card.affinity||''}"${fin?` data-finish="${fin}"`:''}>
      <span class="ark-card-ornament">✦ ${fin?FINISH[fin].name:typeLabel(card.type)} ✦</span>
      ${card.art?`<img src="${card.art}" alt="" loading="lazy">`:
        `<span class="ark-card-glyph" aria-hidden="true">${card.symbol}</span>`}${emblem}
      <span class="ark-card-face-foot">${card.tag}</span></div>`;
  }
  function cardTile(card,s,deck=null){
    const count=s.inventory[card.id]||0,owned=count>0;
    const equipped=deck?.[card.type]===card.id;
    // binder: the face wears this side's finish; MY CARDS: the rarest owned
    const finish=deck?(equipped?deck.finish||'standard':'standard'):(s.finishes?.[card.id]||[]).at(-1)||'standard';
    return `<article class="ark-card-tile ${owned?'ark-unlocked':'ark-unknown'}" data-card-id="${card.id}">
      ${cardFace(card,owned,finish)}
      <div class="ark-card-info">
        <div class="ark-card-meta"><span>${typeLabel(card.type)}</span><span>${owned?'OWNED ×'+count:'LOCKED'}</span></div>
        <h3>${owned?card.name:'UNDISCOVERED '+typeLabel(card.type)}</h3>
        ${owned?rules(card)+fitLine(card,deck):''}
        <p>${owned?card.description:'Win a battle to discover this card.'}</p>
        ${owned?finishChips(card,s,deck):''}
        ${owned&&deck?`<button type="button" data-card-equip="${card.id}" ${equipped?'disabled':''}>
          ${equipped?'✓ EQUIPPED':'EQUIP FOR '+side.toUpperCase()}</button>`:''}
      </div>
    </article>`;
  }
  function summary(s){
    const total=core.CARDS.length,owned=core.CARDS.filter(c=>s.inventory[c.id]>0).length;
    return `<div class="ark-collection-summary" role="status">
      <div><strong>${owned} <span>/ ${total}</span></strong><small>CARDS DISCOVERED</small></div>
      <div><strong>${s.wins}</strong><small>DUELS COMPLETED</small></div>
      <div><strong>${s.persistence==='browser'?'LOCAL SAVE':'SESSION ONLY'}</strong>
        <small>${s.persistence==='browser'?'SAVED IN THIS BROWSER':'BROWSER STORAGE UNAVAILABLE'}</small></div>
    </div>`;
  }
  function nav(active){
    return `<nav class="ark-card-tabs" aria-label="Collection navigation">
      <button type="button" data-card-nav="CARDS" ${active==='CARDS'?'aria-current="page"':''}>MY CARDS</button>
      <button type="button" data-card-nav="BINDER" ${active==='BINDER'?'aria-current="page"':''}>BATTLE BINDER</button>
      <button type="button" data-card-back>← BACK</button>
    </nav>`;
  }
  function inventoryScreen(s){
    const found=core.CARDS.filter(c=>filter==='all'||c.type===filter);
    return `<div class="ark-card-controls" role="group" aria-label="Card type filter">
      ${['all',...core.TYPES].map(t=>`<button type="button" data-card-filter="${t}"
      ${filter===t?'aria-pressed="true"':'aria-pressed="false"'}>${t==='all'?'ALL CARDS':typeLabel(t)}</button>`).join('')}
    </div>
    <div class="ark-card-grid">${found.map(c=>cardTile(c,s)).join('')}</div>
    <p class="ark-card-footnote">A local-first collection. New cards are earned after completing a duel; no purchases or account are required.</p>`;
  }
  function binderScreen(s){
    const deck=s.decks[side];
    const animal=core.BY_ID[deck.animal];
    const m=animal?core.modifiersFor(animal,core.BY_ID[deck.strong],core.BY_ID[deck.miracle]):null;
    const effects=m?[
      ...(m.strongName?[`${m.strongName}: ${TECH[m.strongTechnique]} +${m.strongBonus}`]:[]),
      ...(m.miracleName?[`${m.miracleName}: ✦ +${m.miracleBonus}${m.fits?'':' (does not fit '+shortName(animal.animalId)+': no special effect)'}`]:[])
    ]:[];
    const extras=[core.BY_ID[deck.strong],m?.fits?core.BY_ID[deck.miracle]:null].filter(Boolean)
      .flatMap(c=>c.rules.slice(1).map(r=>c.name+': '+r));
    return `<p class="ark-binder-explainer">Build a three-card loadout: one Animal, one Strong and one Miracle. Both local players share this browser's collection. In solo, each CPU fighter brings its own fitting deck.</p>
    <div class="ark-player-tabs" role="group" aria-label="Player loadout">
      <button type="button" data-card-side="p1" aria-pressed="${side==='p1'}">PLAYER 1</button>
      <button type="button" data-card-side="p2" aria-pressed="${side==='p2'}">PLAYER 2</button>
    </div>
    <div class="ark-deck" aria-label="${side==='p1'?'Player 1':'Player 2'} three-card loadout">
      ${core.TYPES.map(type=>{
        const card=core.BY_ID[deck[type]];
        return `<div class="ark-deck-slot">
          <span>${typeLabel(type)}</span><strong>${card?.name||'EMPTY SLOT'}</strong>
          ${type==='animal'&&deck.finish?`<em class="ark-deck-finish" data-finish="${deck.finish}">${FINISH[deck.finish].name} FINISH</em>`:''}
          <small>${typeHelp(type)}</small>
          ${card&&type!=='animal'?`<button type="button" data-card-unequip="${type}">REMOVE</button>`:''}
        </div>`;
      }).join('')}
    </div>
    ${animal?`<div class="ark-deck-summary" aria-label="What this loadout does">
      <strong>IN BATTLE</strong>${levels(animal)}
      <ul>${[...effects,...extras].map(t=>`<li>${escape(t)}</li>`).join('')||'<li>No Strong or Miracle card equipped.</li>'}</ul>
    </div>`:''}
    <p class="ark-binder-tip">Choose any owned card below to equip it. When picking an animal before battle, that selection updates its Animal slot automatically.</p>
    <div class="ark-card-grid">${core.CARDS.filter(c=>s.inventory[c.id]>0)
      .map(c=>cardTile(c,s,deck)).join('')}</div>
    <div class="ark-card-backup">
      <button type="button" data-card-backup-toggle>${showBackup?'HIDE':'EXPORT / IMPORT'} SAVE DATA</button>
      ${showBackup?`<div class="ark-backup-grid">
      <label>YOUR BACKUP <textarea readonly rows="5" data-card-export-text>${escape(store.exportSave())}</textarea></label>
      <button type="button" data-card-copy>COPY SAVE</button>
      <label>RESTORE BACKUP <textarea rows="5" data-card-import-text placeholder="Paste your saved JSON here">${escape(importText)}</textarea></label>
      <button type="button" data-card-import>IMPORT SAVE</button>
      <button type="button" data-card-dev-finishes title="For testing the looks: adds every finish to this browser's save">DEV · UNLOCK ALL FINISHES</button>
      </div>`:''}
    </div>`;
  }
  function render(which){
    const s=store.getState(),isBinder=which==='BINDER';
    return `<section class="panel ark-collection-panel screen-copy" aria-label="${isBinder?'Digital binder':'My cards'}">
      <div class="section-eyebrow">NOAH'S ARKADE · FIELD COLLECTION</div>
      <h1 class="panel-title">${isBinder?'THE BATTLE BINDER':'MY CARDS'}</h1>
      <p class="ark-card-subhead">${isBinder?'PREPARE YOUR NEXT EXPEDITION':'EVERY WILD LEGEND STARTS SOMEWHERE'}</p>
      ${summary(s)}${nav(which)}
      ${message?`<p class="ark-card-notice" role="status">${escape(message)}</p>`:''}
      ${isBinder?binderScreen(s):inventoryScreen(s)}
      <p class="ark-card-local-note">Cards are saved only in this browser, not synced online. The Cloud Binder is planned for a future phase.</p>
    </section>`;
  }
  function updateMessage(msg){message=msg;refresh();}
  // a won match: a card, plus maybe a rare finish for the animal P1 fought with
  function grantBattleReward(animalId){
    const reward=store.grantReward();
    const finish=animalId?store.grantFinish(animalId):null;
    if(reward)message=`DUEL REWARD: ${reward.name}`+(finish?` · NEW ${finish.name} ${core.BY_ID[finish.card].name}!`:'');
    return reward?{...reward,finish}:finish?{finish}:null;
  }
  ui.addEventListener('click',async event=>{
    const target=event.target;
    if(!['CARDS','BINDER'].includes(screen()))return;
    const route=target.closest('[data-card-nav]');
    if(route){open(route.dataset.cardNav);return;}
    if(target.closest('[data-card-back]')){window.__arkade?.goBack();return;}
    const f=target.closest('[data-card-filter]');
    if(f){filter=f.dataset.cardFilter;refresh();return;}
    const p=target.closest('[data-card-side]');
    if(p){side=p.dataset.cardSide;refresh();return;}
    const equip=target.closest('[data-card-equip]');
    if(equip){
      const ok=store.equip(side,equip.dataset.cardEquip);
      updateMessage(ok?'CARD EQUIPPED':'CARD NOT OWNED');
      return;
    }
    const fin=target.closest('[data-card-finish]');
    if(fin){
      // wearing a finish equips its animal on this side first
      if(store.getDeck(side).animal!==fin.dataset.cardFor)store.equip(side,fin.dataset.cardFor);
      const ok=store.setFinish(side,fin.dataset.cardFinish);
      updateMessage(ok?(fin.dataset.cardFinish==='standard'?'STANDARD FINISH':FINISH[fin.dataset.cardFinish].name+' FINISH ON'):'FINISH NOT FOUND YET');
      return;
    }
    if(target.closest('[data-card-dev-finishes]')){
      for(const c of core.CARDS.filter(c=>c.type==='animal'))
        for(const v of [0,.03,.1])store.grantFinish(c.animalId,()=>v);
      updateMessage('DEV: EVERY FINISH ADDED TO THIS SAVE');return;
    }
    const remove=target.closest('[data-card-unequip]');
    if(remove){store.unequip(side,remove.dataset.cardUnequip);updateMessage('SLOT CLEARED');return;}
    if(target.closest('[data-card-backup-toggle]')){showBackup=!showBackup;refresh();return;}
    if(target.closest('[data-card-copy]')){
      const txt=store.exportSave();
      try{await navigator.clipboard.writeText(txt);updateMessage('SAVE COPIED TO CLIPBOARD');}
      catch{updateMessage('COPY THE BACKUP TEXT MANUALLY');}
      return;
    }
    if(target.closest('[data-card-import]')){
      importText=ui.querySelector('[data-card-import-text]')?.value||'';
      const ok=store.importSave(importText);
      if(ok)importText='';
      updateMessage(ok?'BACKUP RESTORED':'INVALID BACKUP — NO CHANGES SAVED');
    }
  });
  window.NoahsCards=Object.freeze({
    render,open,store,grantBattleReward,
    equipAnimal:(playerIndex,animalId)=>store.equip(playerIndex===1?'p2':'p1','animal:'+animalId),
    getModifiers:(playerIndex,animalId)=>store.getModifiers(playerIndex===1?'p2':'p1',animalId),
    getFinish:(playerIndex,animalId)=>store.getFinish(playerIndex===1?'p2':'p1',animalId)
  });
})();
