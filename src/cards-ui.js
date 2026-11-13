/* Noah's Arkade Phase 4 collection + binder. Persist only to this browser.
 * Never implies cloud saves, real money, or an online account. */
(function(){
  'use strict';
  const core=window.ArkadeCardsCore,ui=document.getElementById('ui');
  if(!core||!ui)return;
  const store=core.createStore(window.localStorage);
  const screen=()=>window.__arkade?.getScreen();
  let filter='all',side='p1',message='',showBackup=false,importText='';
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const typeLabel=type=>type==='animal'?'ANIMAL':type==='strong'?'STRONG':'MIRACLE';
  const typeHelp=type=>type==='animal'?'Choose your champion':
    type==='strong'?'Boost one fighting feature':'Amplify a ✦ special attack';
  function open(view='CARDS'){
    filter='all';message='';showBackup=false;importText='';
    window.__arkade?.openScreen(view==='BINDER'?'BINDER':'CARDS');
  }
  function refresh(){const current=screen();if(['CARDS','BINDER'].includes(current))openScreen(current);}
  function openScreen(which){window.__arkade?.openScreen(which);}
  function cardFace(card,owned){
    if(!owned)return `<div class="ark-card-face ark-locked" aria-label="Locked card">
      <span class="ark-card-ornament">✦ ◈ ✦</span><span class="ark-card-mystery">?</span>
      <span class="ark-card-face-foot">UNRECOVERED</span></div>`;
    return `<div class="ark-card-face ark-${card.type}">
      <span class="ark-card-ornament">✦ ${typeLabel(card.type)} ✦</span>
      ${card.art?`<img src="${card.art}" alt="" loading="lazy">`:
        `<span class="ark-card-glyph" aria-hidden="true">${card.symbol}</span>`}
      <span class="ark-card-face-foot">${card.tag}</span></div>`;
  }
  function cardTile(card,s,deck=null){
    const count=s.inventory[card.id]||0,owned=count>0;
    const equipped=deck?.[card.type]===card.id;
    return `<article class="ark-card-tile ${owned?'ark-unlocked':'ark-unknown'}" data-card-id="${card.id}">
      ${cardFace(card,owned)}
      <div class="ark-card-info">
        <div class="ark-card-meta"><span>${typeLabel(card.type)}</span><span>${owned?'OWNED ×'+count:'LOCKED'}</span></div>
        <h3>${owned?card.name:'UNDISCOVERED '+typeLabel(card.type)}</h3>
        <p>${owned?card.description:'Win a battle to discover this card.'}</p>
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
      <button type="button" data-card-back>← MAIN MENU</button>
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
    return `<p class="ark-binder-explainer">Build a three-card loadout: one Animal, one Strong, and one Miracle. These prototype bonuses apply during battles. Both local players share this browser's collection.</p>
    <div class="ark-player-tabs" role="group" aria-label="Player loadout">
      <button type="button" data-card-side="p1" aria-pressed="${side==='p1'}">PLAYER 1</button>
      <button type="button" data-card-side="p2" aria-pressed="${side==='p2'}">PLAYER 2</button>
    </div>
    <div class="ark-deck" aria-label="${side==='p1'?'Player 1':'Player 2'} three-card loadout">
      ${core.TYPES.map(type=>{
        const card=core.BY_ID[deck[type]];
        return `<div class="ark-deck-slot">
          <span>${typeLabel(type)}</span><strong>${card?.name||'EMPTY SLOT'}</strong>
          <small>${typeHelp(type)}</small>
          ${card&&type!=='animal'?`<button type="button" data-card-unequip="${type}">REMOVE</button>`:''}
        </div>`;
      }).join('')}
    </div>
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
  function grantBattleReward(){
    const reward=store.grantReward();
    if(reward)message=`DUEL REWARD: ${reward.name}`;
    return reward;
  }
  ui.addEventListener('click',async event=>{
    const target=event.target;
    if(!['CARDS','BINDER'].includes(screen()))return;
    const route=target.closest('[data-card-nav]');
    if(route){open(route.dataset.cardNav);return;}
    if(target.closest('[data-card-back]')){window.__arkade?.openScreen('MAIN_MENU');return;}
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
    getModifiers:(playerIndex,animalId)=>store.getModifiers(playerIndex===1?'p2':'p1',animalId)
  });
})();
