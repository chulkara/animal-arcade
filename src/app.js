/* NOAH'S ARKADE · Phase 1 · Original local-first arcade title shell.
   No network, account, backend, card inventory, or combat simulator is involved. */
(function () {
  'use strict';
  const STORAGE_KEY='noahs-arkade.settings.v1';
  const SESSION_KEY='noahs-arkade.intro-seen.v1';
  const OPTIONS=[
    {label:'1 PLAYER',screen:'SOLO_PREVIEW',eyebrow:'01 · THE SOLO TRAIL'},
    {label:'2 PLAYERS',screen:'MULTIPLAYER_PREVIEW',eyebrow:'02 · TWO ENTER THE WILD'},
    {label:'MY BINDER',screen:'BINDER_PREVIEW',eyebrow:'03 · THE ARCHIVE'},
    {label:'HOW TO PLAY',screen:'HELP_PREVIEW',eyebrow:'04 · THE FIELD GUIDE'},
    {label:'OPTIONS',screen:'OPTIONS',eyebrow:'05 · THE WORKSHOP'}
  ];
  const defaults={master:65,music:28,sfx:75,mute:false,reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false,grain:true,globe:true};
  function loadSettings(){
    let stored;
    try { stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); } catch { return {...defaults}; }
    if(!stored || typeof stored!=='object' || Array.isArray(stored)) return {...defaults};
    const settings={...defaults};
    for(const key of ['master','music','sfx']){
      if(typeof stored[key]==='number' && Number.isFinite(stored[key]))
        settings[key]=Math.round(Math.max(0,Math.min(100,stored[key])));
    }
    for(const key of ['mute','reducedMotion','grain','globe']){
      if(typeof stored[key]==='boolean') settings[key]=stored[key];
    }
    return settings;
  }
  const model={screen:'TITLE',selection:0,settings:loadSettings(),introSeen:false,webglError:null,fromMenu:true,returnScreen:'MAIN_MENU'};
  const game=document.getElementById('game');
  const ui=document.getElementById('ui');
  const globeCanvas=document.getElementById('globe-canvas');
  const fallback=document.getElementById('globe-fallback');
  const audio=window.NoahsAudio;
  let introTimer=0;
  let globe=null;
  let lastHover=-1;
  let started=false;

  const logo=`<svg class="logo-illustration" viewBox="0 0 880 345" role="img" aria-label="Noah's Arkade" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="arcadeGold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffedb9"/><stop offset=".37" stop-color="#e3c27b"/><stop offset=".64" stop-color="#a87942"/><stop offset="1" stop-color="#f1d391"/></linearGradient>
      <linearGradient id="arcadeIvory" x1="0" x2=".8" y1="0" y2="1"><stop offset="0" stop-color="#fff5d6"/><stop offset=".55" stop-color="#f6df9c"/><stop offset=".75" stop-color="#bd864a"/><stop offset="1" stop-color="#f7e4b5"/></linearGradient>
      <linearGradient id="arcadeRed" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#5a2630"/><stop offset=".5" stop-color="#b2573d"/><stop offset="1" stop-color="#6e2933"/></linearGradient>
      <filter id="arcadeShadow" x="-30%" y="-40%" width="160%" height="180%"><feDropShadow dx="4" dy="9" stdDeviation="5" flood-color="#000c14" flood-opacity=".82"/></filter>
    </defs>
    <g fill="none" stroke="#cfa966" stroke-width="3" opacity=".84"><path d="M48 167C155 155 194 97 216 65M830 167C725 155 686 97 666 65"/><path d="M48 177C164 190 211 221 230 240M830 177C718 190 675 221 651 240"/><path d="M63 168Q117 126 154 139M815 168Q764 127 724 139"/></g>
    <path d="M82 257C214 292 635 293 784 253" fill="none" stroke="#6c292b" stroke-width="21" stroke-linecap="round"/>
    <path d="M80 255C216 282 633 284 786 251" fill="none" stroke="#dbad64" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(440 52)"><path d="M0-42L12-13L40 0L11 11L0 42L-10 12L-40 0L-10-12Z" fill="url(#arcadeGold)" stroke="#2b2021" stroke-width="5"/><circle r="6" fill="#f9f1cb"/></g>
    <g font-family="DejaVu Sans,Arial Black,Impact,sans-serif" font-style="italic" font-weight="900" text-anchor="middle" paint-order="stroke" filter="url(#arcadeShadow)">
      <text x="440" y="137" font-size="116" letter-spacing="-6" fill="#081b2c" stroke="#071322" stroke-width="17">NOAH'S</text>
      <text x="440" y="132" font-size="116" letter-spacing="-6" fill="url(#arcadeGold)" stroke="#e5c986" stroke-width="3">NOAH'S</text>
      <text x="440" y="260" font-size="157" letter-spacing="-9" fill="#081b2c" stroke="#061322" stroke-width="21">ARKADE</text>
      <text x="440" y="250" font-size="157" letter-spacing="-9" fill="url(#arcadeIvory)" stroke="#d9b773" stroke-width="4">ARKADE</text>
    </g>
    <g fill="none" stroke="#d5b87f" stroke-width="2" opacity=".9"><path d="M244 305H636"/><path d="M268 313H612"/><circle cx="228" cy="305" r="4" fill="#c1a16f"/><circle cx="652" cy="305" r="4" fill="#c1a16f"/></g>
    <text x="440" y="333" text-anchor="middle" font-family="Georgia,serif" font-size="17" letter-spacing="8" fill="#f0deb5">THE WORLD IS WILD</text>
  </svg>`;

  function onFailure(reason){model.webglError=reason;fallback.hidden=false;globeCanvas.hidden=true;game.classList.add('fallback-globe');}
  try{globe=window.NoahsGlobe.mount(globeCanvas,onFailure);}catch(error){onFailure(String(error));}
  function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(model.settings));}catch{/* Settings remain usable this session */}}
  function syncSettings(){
    const s=model.settings;
    game.classList.toggle('reduce-motion',Boolean(s.reducedMotion));
    game.classList.toggle('no-grain',!s.grain);
    game.classList.toggle('still-globe',!s.globe);
    globe?.update({rotate:s.globe,motion:s.reducedMotion});
    audio.update({master:s.master/100,music:s.music/100,sfx:s.sfx/100,mute:s.mute});
    save();
  }
  function setScreen(screen){
    model.screen=screen;game.dataset.screen=screen;
    ui.innerHTML=screen==='TITLE'?titleScreen():screen==='MAIN_MENU'?mainMenu():screen==='MODE_MENU'?modeMenu():screen==='OPTIONS'?optionsScreen():previewScreen(screen);
    const main=ui.querySelector('[data-initial-focus]');
    if(screen!=='TITLE'&&main)requestAnimationFrame(()=>main.focus({preventScroll:true}));
    document.title=screen==='TITLE'||screen==='MAIN_MENU'?"NOAH'S ARKADE — The World Is Wild":`${screen.replace('_PREVIEW','').replaceAll('_',' ')} · NOAH'S ARKADE`;
    if(started) audio.setMusic(screen!=='TITLE');
    window.dispatchEvent(new CustomEvent('arkade:screenchange',{detail:{screen}}));
    const foot=document.getElementById('foot-hints');
    foot.innerHTML=screen==='TITLE'?'<kbd>ENTER</kbd> START':screen==='MAIN_MENU'?'<kbd>↑</kbd><kbd>↓</kbd> CHOOSE <span class="hint-gap"></span> <kbd>ENTER</kbd> SELECT':'<kbd>ESC</kbd> BACK';
  }
  function start(){
    if(model.screen!=='TITLE')return;
    window.clearTimeout(introTimer);game.classList.add('intro-complete');model.introSeen=true;
    try{sessionStorage.setItem(SESSION_KEY,'1');}catch{}
    started=true; audio.unlock();audio.cue('reveal');audio.setMusic(true);
    setScreen('MAIN_MENU');
  }
  function activate(index){
    model.selection=index; lastHover=-1;
    audio.unlock();audio.cue('confirm');
    setScreen(OPTIONS[index].screen);
  }
  function back(){
    if(model.screen==='MAIN_MENU'){
      audio.cue('back');
      if(game.classList.contains('painted-enabled'))return;
      audio.setMusic(false);setScreen('TITLE');return;
    }
    if(model.screen==='TITLE')return;
    audio.cue('back');
    const returnTo=model.screen!=='MODE_MENU' && model.returnScreen==='MODE_MENU' ? 'MODE_MENU' : 'MAIN_MENU';
    model.returnScreen='MAIN_MENU';
    setScreen(returnTo);
    refreshSelection();
  }
  function move(direction){
    if(model.screen!=='MAIN_MENU')return;
    model.selection=(model.selection+direction+OPTIONS.length)%OPTIONS.length;
    audio.cue('move');refreshSelection();
  }
  function refreshSelection(){
    ui.querySelectorAll('[data-option]').forEach((item,i)=>{
      const selected=i===model.selection;
      item.classList.toggle('selected',selected);
      item.setAttribute('aria-current',selected?'true':'false');
      item.tabIndex=selected?0:-1;
    });
    const caption=document.getElementById('option-caption');
    if(caption)caption.textContent=OPTIONS[model.selection].eyebrow;
  }
  function titleScreen(){return `<div class="screen-title screen-copy">
    <div class="title-subline" aria-hidden="true"><span>✧</span> AN ARCADE WORLD REBORN <span>✧</span></div>
    <button class="press-start" type="button" data-start aria-label="Press Start to open the main menu"><span class="start-diamond">◆</span> PRESS START <span class="start-diamond">◆</span></button>
    <p class="start-meta">A WORLD OF WILD THINGS AWAITS</p>
  </div>`;}
  function mainMenu(){return `<div class="screen-main screen-copy">
    <div class="menu-heading"><span class="line-rule"></span><span>CHOOSE YOUR PATH</span><span class="line-rule"></span></div>
    <nav class="menu-list" aria-label="Main menu">
      ${OPTIONS.map((opt,i)=>`<button type="button" data-option="${i}" class="menu-choice ${i===model.selection?'selected':''}" aria-current="${i===model.selection?'true':'false'}" ${i===model.selection?'data-initial-focus':''} tabIndex="${i===model.selection?0:-1}"><span class="menu-pointer" aria-hidden="true">◆</span><span class="choice-text">${opt.label}</span><span class="choice-flourish" aria-hidden="true">›</span></button>`).join('')}
    </nav>
    <div class="menu-caption"><span class="caption-dot">✶</span><span id="option-caption">${OPTIONS[model.selection].eyebrow}</span></div>
    <p class="menu-footnote">EVERY LEGEND BEGINS SOMEWHERE</p>
  </div>`;}
  function modeMenu(){return `<section class="panel painted-submenu screen-copy" aria-label="Choose game mode">
    <div class="section-eyebrow">THE WILD AWAITS</div><h1 class="panel-title">CHOOSE YOUR PATH</h1>
    <div class="ornament-line"><span>✦</span></div>
    <nav class="mode-options" aria-label="Play modes">
      <button type="button" data-mode="SOLO_PREVIEW" data-initial-focus>1 PLAYER <small>VERSUS THE WILD</small></button>
      <button type="button" data-mode="MULTIPLAYER_PREVIEW">2 PLAYERS <small>LOCAL DUEL · PLANNED</small></button>
      <button type="button" data-mode="HELP_PREVIEW">HOW TO PLAY <small>THE FIELD GUIDE</small></button>
    </nav>
    <button class="arcade-back" type="button" data-back>← RETURN TO MENU</button>
  </section>`;}
  function previewScreen(screen){
    const data={
      SOLO_PREVIEW:{no:'01 / 05',kicker:'BEYOND THE GATE',title:'SOLO EXPEDITION',quote:'Challenge the wild.',body:'A journey through the animal kingdom is taking shape. Battles and computer opponents arrive in a later development phase.',tag:'BATTLE MODE · COMING LATER',graphic:'paw'},
      MULTIPLAYER_PREVIEW:{no:'02 / 05',kicker:'THE TWO-PERSON PATH',title:'THE WILD DUEL',quote:'Every rival has a story.',body:'Two players, one machine. Local duels are planned first; private online matches may follow. Neither mode is playable in Phase 1.',tag:'LOCAL DUEL · PLANNED',graphic:'versus'},
      BINDER_PREVIEW:{no:'03 / 05',kicker:'THE COLLECTOR’S ROOM',title:'MY BINDER',quote:'A world worth collecting.',body:'Animal, Strong, and Miracle cards will live here someday, with beautifully illustrated alternate skins. This is a glimpse of the future archive, not a card inventory.',tag:'COLLECTION · COMING LATER',graphic:'cards'},
      HELP_PREVIEW:{no:'04 / 05',kicker:'THE FIELD GUIDE',title:'HOW TO PLAY',quote:'The rules of the wild.',body:'The upcoming guide will cover Animal, Strong, and Miracle cards, the attack-selection reel, timing, and battle flow. Detailed rules will be verified before implementation.',tag:'FIELD GUIDE · IN PREPARATION',graphic:'book'},
      MY_CARDS_PREVIEW:{no:'02 / 05',kicker:'THE CARD COLLECTION',title:'MY CARDS',quote:'Every wild legend starts somewhere.',body:'Your digital Animal, Strong, and Miracle cards will be organized here in a future phase. No cards or purchases are available yet.',tag:'CARD COLLECTION · COMING LATER',graphic:'cards'},
      SHOP_PREVIEW:{no:'04 / 05',kicker:'THE TRADING OUTPOST',title:'SHOP',quote:'Find the rare and remarkable.',body:'A future home for collectible cards and cosmetic skins. The shop is a preview only: no real purchases, currency, or inventory.',tag:'SHOP · COMING LATER',graphic:'cards'}
    }[screen];
    const art=data.graphic==='cards'?`<div class="preview-cards" aria-hidden="true"><div class="preview-card left"><span>✦</span></div><div class="preview-card center"><span>✥</span></div><div class="preview-card right"><span>✦</span></div></div>`:
      data.graphic==='versus'?'<div class="preview-symbol" aria-hidden="true">Ⅰ <span>✦</span> Ⅱ</div>':
      data.graphic==='book'?'<div class="preview-symbol" aria-hidden="true">☷</div>':
      '<div class="preview-symbol" aria-hidden="true">✧</div>';
    return `<section class="panel preview-panel screen-copy" aria-label="${data.title}">
      <div class="panel-number">${data.no}</div><div class="section-eyebrow">${data.kicker}</div>
      <h1 class="panel-title">${data.title}</h1><div class="ornament-line"><span>✦</span></div>
      ${art}<p class="preview-quote">${data.quote}</p><p class="preview-description">${data.body}</p>
      <p class="phase-tag">${data.tag}</p>
      <button class="arcade-back" type="button" data-back data-initial-focus><span aria-hidden="true">←</span> RETURN TO MENU</button>
    </section>`;
  }
  function slider(name,label,value){return `<div class="option-row"><label for="setting-${name}"><span>${label}</span><span class="value-label" id="value-${name}">${value}%</span></label><input type="range" data-setting="${name}" id="setting-${name}" min="0" max="100" step="1" value="${value}" aria-label="${label}" /></div>`;}
  function toggle(name,label,description,value){return `<label class="option-switch-row"><span class="switch-copy"><span class="switch-title">${label}</span><span class="switch-hint">${description}</span></span><input type="checkbox" data-setting="${name}" ${value?'checked':''} /><span class="switch-visual" aria-hidden="true"><span></span></span></label>`;}
  function optionsScreen(){const s=model.settings;return `<section class="panel options-panel screen-copy" aria-label="Options">
    <div class="panel-number">05 / 05</div><div class="section-eyebrow">TUNE THE EXPERIENCE</div><h1 class="panel-title">OPTIONS</h1><div class="ornament-line"><span>✦</span></div>
    <div class="options-columns"><div class="setting-column"><h2>✧ &nbsp; SOUND</h2>
      ${slider('master','MASTER VOLUME',s.master)}${slider('music','MUSIC',s.music)}${slider('sfx','SOUND EFFECTS',s.sfx)}
      ${toggle('mute','MUTE ALL','Silence music and menu sounds',s.mute)}
    </div><div class="setting-column"><h2>✧ &nbsp; DISPLAY</h2>
      ${toggle('reducedMotion','REDUCED MOTION','Fewer reveals and moving elements',s.reducedMotion)}
      ${toggle('grain','FILM GRAIN','Subtle printed-paper texture',s.grain)}
      ${toggle('globe','ROTATING GLOBE','Continue the atlas animation',s.globe)}
      <p class="settings-note">All settings are saved on this device. Audio begins only after you press Start.</p>
    </div></div>
    <button class="arcade-back" type="button" data-back data-initial-focus><span aria-hidden="true">←</span> RETURN TO MENU</button>
  </section>`;}

  // Shared game-level event delegation. The globe canvas persists through navigation.
  ui.addEventListener('click',(e)=>{
    const target=e.target;
    const startButton=target.closest('[data-start]');
    if(startButton){start();return;}
    const option=target.closest('[data-option]');
    if(option){activate(Number(option.dataset.option));return;}
    const mode=target.closest('[data-mode]');
    if(mode){model.returnScreen='MODE_MENU';audio.unlock();audio.cue('confirm');setScreen(mode.dataset.mode);return;}
    if(target.closest('[data-back]'))back();
  });
  ui.addEventListener('pointerover',(e)=>{
    const option=e.target.closest('[data-option]');
    if(!option||model.screen!=='MAIN_MENU')return;
    const i=Number(option.dataset.option);
    if(i!==model.selection){model.selection=i;refreshSelection();}
    if(i!==lastHover){lastHover=i;audio.cue('move');}
  });
  ui.addEventListener('input',(e)=>{
    const input=e.target.closest('[data-setting]');
    if(!input)return;
    const key=input.dataset.setting;
    if(input.type==='range'){
      model.settings[key]=Number(input.value);
      document.getElementById(`value-${key}`).textContent=`${input.value}%`;
    } else {model.settings[key]=input.checked;}
    syncSettings();
  });
  ui.addEventListener('change',(e)=>{
    const input=e.target.closest('[data-setting]');
    if(input&&input.type==='checkbox'){model.settings[input.dataset.setting]=input.checked;syncSettings();}
  });
  window.addEventListener('keydown',(e)=>{
    const tag=document.activeElement?.tagName;
    const range=tag==='INPUT' && document.activeElement?.type==='range';
    if(e.key==='Escape'||e.key==='Backspace'&&(tag!=='INPUT'&&tag!=='TEXTAREA')){
      if(model.screen!=='TITLE'){e.preventDefault();back();}return;
    }
    if(model.screen==='TITLE'){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();start();}return;
    }
    if(model.screen==='MODE_MENU' && !['INPUT','TEXTAREA'].includes(tag)){
      const buttons=[...ui.querySelectorAll('[data-mode]')];
      if(['ArrowUp','w','W','ArrowDown','s','S'].includes(e.key)){
        e.preventDefault();
        const current=buttons.indexOf(document.activeElement);
        const direction=['ArrowUp','w','W'].includes(e.key)?-1:1;
        const next=buttons[(Math.max(current,0)+direction+buttons.length)%buttons.length];
        next?.focus({preventScroll:true});audio.cue('move');
      }
      return;
    }
    if(model.screen==='MAIN_MENU'){
      if(['ArrowUp','w','W'].includes(e.key)){e.preventDefault();move(-1);ui.querySelector('[data-option].selected')?.focus({preventScroll:true});}
      else if(['ArrowDown','s','S'].includes(e.key)){e.preventDefault();move(1);ui.querySelector('[data-option].selected')?.focus({preventScroll:true});}
      else if((e.key==='Enter'||e.key===' ') && (tag!=='BUTTON'||document.activeElement?.hasAttribute('data-option'))){
        e.preventDefault();activate(document.activeElement?.hasAttribute('data-option')?Number(document.activeElement.dataset.option):model.selection);
      }
    } else if(model.screen!=='OPTIONS'&&!range&&(e.key==='Enter'||e.key===' ')&&tag!=='BUTTON'){
      e.preventDefault();back();
    }
  });
  // Title-screen first click skips the intro and immediately starts the game menu.
  game.addEventListener('pointerdown',(e)=>{
    if(model.screen==='TITLE' && !e.target.closest('[data-start]')) start();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)audio.setMusic(false);
    else if(started&&model.screen!=='TITLE')audio.setMusic(true);
  });
  function init(){
    // Logo exists once, outside the changing menu state.
    document.getElementById('logo-mount').innerHTML=logo;
    try{model.introSeen=sessionStorage.getItem(SESSION_KEY)==='1';}catch{}
    if(model.introSeen||model.settings.reducedMotion) game.classList.add('intro-complete');
    else introTimer=window.setTimeout(()=>{
      game.classList.add('intro-complete');
      try{sessionStorage.setItem(SESSION_KEY,'1');}catch{}
    },3100);
    syncSettings();setScreen('TITLE');
  }
  init();
  // Lightweight inspection surface for automated local UI tests.
  window.__arkade={
    getScreen:()=>model.screen,getSettings:()=>({...model.settings}),getSelection:()=>model.selection,goBack:back,
    showPaintedMenu:()=>{window.clearTimeout(introTimer);game.classList.add('intro-complete');setScreen('MAIN_MENU');},
    openPainted:(action)=>{
      const targets={PLAY:'MODE_MENU',MY_CARDS:'MY_CARDS_PREVIEW',BINDER:'BINDER_PREVIEW',SHOP:'SHOP_PREVIEW',SETTINGS:'OPTIONS'};
      const target=targets[action];if(!target)return false;
      started=true;audio.unlock();audio.cue('confirm');model.returnScreen='MAIN_MENU';setScreen(target);return true;
    }
  };
})();