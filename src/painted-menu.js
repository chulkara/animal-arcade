/* Exact-art menu overlay: rendered only if the approved original PNG is present.
   No image manipulation, crop, filters, re-lettering, or synthetic replacements of the art.
   Everything interactive is an overlay positioned in the painting's own pixel space. */
(function () {
  'use strict';
  const game=document.getElementById('game');
  const arkade=window.__arkade;
  if(!game||!arkade)return;
  const ART='./assets/approved-menu.png';
  const ART_W=1672, ART_H=941;
  // Painted button rectangles, measured from the artwork's cream borders (painting pixels).
  const actions=[
    {id:'PLAY',label:'Play',r:[641,501,1031,561]},
    {id:'MY_CARDS',label:'My Cards',r:[652,578,1021,631]},
    {id:'BINDER',label:'Binder',r:[652,646,1021,699]},
    {id:'SHOP',label:'Shop',r:[652,710,1021,763]},
    {id:'SETTINGS',label:'Settings',r:[652,775,1021,828]}
  ];
  const PX=x=>(x/ART_W*100)+'%';
  const PY=y=>(y/ART_H*100)+'%';
  const INTRO_KEY='noahs-arkade.painted-intro.v1';
  const audio=()=>window.NoahsAudio;
  const reducedMotion=()=>game.classList.contains('reduce-motion')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Chamfered "pill" shapes matching the painted buttons.
  function pillClip(w,h,inset=0){
    const c=(h*0.5)/w*100;
    return `polygon(0% 50%, ${c}% 0%, ${100-c}% 0%, 100% 50%, ${100-c}% 100%, ${c}% 100%)`;
  }
  function pillPoints(w,h,i=1.5){
    const c=h*0.5;
    return [[i,h/2],[c+i*.6,i],[w-c-i*.6,i],[w-i,h/2],[w-c-i*.6,h-i],[c+i*.6,h-i]].map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ');
  }
  function place(el,[x0,y0,x1,y1]){
    el.style.left=PX(x0);el.style.top=PY(y0);el.style.width=PX(x1-x0);el.style.height=PY(y1-y0);
  }
  function pill(label,rect,lit,big){
    const [x0,y0,x1,y1]=rect,w=x1-x0,h=y1-y0;
    const el=document.createElement('span');
    el.className='pm-pill'+(lit?' pm-pill--lit':'')+(big?' pm-pill--big':'');
    el.setAttribute('aria-hidden','true');
    place(el,rect);
    el.innerHTML=`<span class="pm-pill__edge" style="clip-path:${pillClip(w,h)}"></span><span class="pm-pill__face" style="clip-path:${pillClip(w-6,h-6)}"></span><span class="pm-pill__label">${label.toUpperCase()}</span>`;
    return el;
  }

  const art=new Image();
  art.onload=()=>{
    if(art.naturalWidth<100||art.naturalHeight<100)return;
    art.alt="Noah's Arkade illustrated game menu, with animals surrounding a globe";
    art.draggable=false;
    art.className='painted-art';
    const stage=document.createElement('div');
    stage.id='painted-stage';
    stage.className='painted-stage';
    stage.setAttribute('aria-label',"Noah's Arkade");
    const hotspots=document.createElement('nav');
    hotspots.className='painted-hotspots';
    hotspots.setAttribute('aria-label','Main menu');
    const dock=document.createElement('nav');
    dock.className='painted-mobile-nav';
    dock.setAttribute('aria-label','Mobile main menu');

    // --- selection layer (desktop) ---
    const cursor=document.createElement('div');
    cursor.className='pm-cursor';
    cursor.setAttribute('aria-hidden','true');
    const unlit=document.createElement('div');
    unlit.className='pm-unlit';
    const eraseL=document.createElement('span');eraseL.className='pm-erase';place(eraseL,[578,488,630,574]);eraseL.style.background='#414c55';
    const eraseR=document.createElement('span');eraseR.className='pm-erase';place(eraseR,[1042,488,1094,574]);eraseR.style.background='#455050';
    const halo=document.createElement('span');halo.className='pm-halo';place(halo,[633,494,1039,568]);
    unlit.append(eraseL,eraseR,halo,pill('PLAY',actions[0].r,false,true));
    const litSlot=document.createElement('div');litSlot.className='pm-lit-slot';
    const sel=document.createElement('div');sel.className='pm-sel';
    sel.innerHTML='<span class="pm-sel__shine"></span><span class="pm-sel__flash"></span>';
    const arrowL=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const arrowR=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [a,d,cls] of [[arrowL,'M1 1 L22 14 L1 27 Z','pm-arrow pm-arrow--l'],[arrowR,'M22 1 L1 14 L22 27 Z','pm-arrow pm-arrow--r']]){
      a.setAttribute('viewBox','0 0 23 28');a.setAttribute('class',cls);
      a.innerHTML=`<path d="${d}"/>`;
    }
    const runs=document.createElement('div');runs.className='pm-runs';
    for(const [i,item] of actions.entries()){
      const [x0,y0,x1,y1]=item.r;
      const run=document.createElementNS('http://www.w3.org/2000/svg','svg');
      run.setAttribute('class','pm-run');run.setAttribute('viewBox',`0 0 ${x1-x0} ${y1-y0}`);run.setAttribute('preserveAspectRatio','none');
      run.style.setProperty('--i',i);
      run.innerHTML=`<polygon points="${pillPoints(x1-x0,y1-y0)}"/>`;
      place(run,item.r);runs.appendChild(run);
    }
    const glint=document.createElement('span');glint.className='pm-glint';glint.style.left=PX(1103);glint.style.top=PY(214);
    cursor.append(glint,runs,unlit,litSlot,sel,arrowL,arrowR);

    // --- attract mode: CRT power-on + PRESS START (first visit per session, full motion only) ---
    const crt=document.createElement('div');crt.className='pm-crt';crt.setAttribute('aria-hidden','true');
    crt.innerHTML='<span class="pm-crt__half pm-crt__half--top"></span><span class="pm-crt__half pm-crt__half--bottom"></span><span class="pm-crt__beam"></span><span class="pm-crt__bloom"></span>';
    const pressStart=document.createElement('button');
    pressStart.type='button';pressStart.className='pm-press-start';pressStart.textContent='PRESS START';
    pressStart.style.left=PX(836);pressStart.style.top=PY(893);
    pressStart.tabIndex=-1;

    for(const item of actions){
      const hotspot=document.createElement('button');
      hotspot.type='button';
      hotspot.className='painted-hotspot';
      hotspot.dataset.artAction=item.id;
      hotspot.setAttribute('aria-label',item.label);
      place(hotspot,item.r);
      hotspots.appendChild(hotspot);
      const mobile=document.createElement('button');
      mobile.type='button';
      mobile.className='painted-mobile-button';
      mobile.dataset.artAction=item.id;
      mobile.textContent=item.label.toUpperCase();
      dock.appendChild(mobile);
    }
    stage.append(art,cursor,hotspots,pressStart,crt,dock);
    game.appendChild(stage);
    game.classList.add('painted-enabled','intro-complete');
    let selected=0;
    let busy=false;
    let attract=false;
    const controls=[...stage.querySelectorAll('[data-art-action]')];

    function drawSelection(){
      const r=actions[selected].r,[x0,y0,x1,y1]=r,w=x1-x0,h=y1-y0,cy=(y0+y1)/2;
      stage.dataset.selected=actions[selected].id;
      unlit.classList.toggle('is-on',selected!==0);
      litSlot.replaceChildren(...(selected!==0?[pill(actions[selected].label,r,true,false)]:[]));
      place(sel,r);sel.style.clipPath=pillClip(w,h);
      const shine=sel.querySelector('.pm-sel__shine');
      shine.classList.remove('is-go');void shine.offsetWidth;shine.classList.add('is-go');
      for(const [a,x] of [[arrowL,x0-46],[arrowR,x1+24]]){
        a.style.left=PX(x);a.style.top=PY(cy-14);a.style.width=PX(23);a.style.height=PY(28);
        a.classList.toggle('is-painted',selected===0); // the painting already draws PLAY's arrows
      }
    }
    function setSelection(index,focus=false){
      selected=(index+actions.length)%actions.length;
      for(const button of controls){
        const active=button.dataset.artAction===actions[selected].id;
        button.classList.toggle('active',active);
        button.setAttribute('aria-current',active?'true':'false');
        button.tabIndex=active?0:-1;
      }
      drawSelection();
      if(focus){
        const useDock=window.matchMedia('(max-aspect-ratio: 4/5)').matches;
        const selector=useDock?'.painted-mobile-button.active':'.painted-hotspot.active';
        stage.querySelector(selector)?.focus({preventScroll:true});
      }
    }
    function activate(action){
      if(arkade.getScreen()!=='MAIN_MENU'||busy)return;
      if(reducedMotion()){arkade.openPainted(action);return;}
      // A short press beat: the button flashes and the arrows pinch in, then the panel opens.
      busy=true;
      window.NoahsAudio?.unlock?.();
      stage.classList.add('is-pressing');
      window.setTimeout(()=>{
        stage.classList.remove('is-pressing');
        busy=false;
        arkade.openPainted(action);
      },180);
    }
    function lightRun(){
      if(reducedMotion())return;
      stage.classList.remove('is-armed');void stage.offsetWidth;stage.classList.add('is-armed');
      window.setTimeout(()=>stage.classList.remove('is-armed'),900);
    }
    function endAttract(withFanfare=true){
      if(!attract)return;
      attract=false;
      try{sessionStorage.setItem(INTRO_KEY,'1');}catch{}
      const a=audio();
      a?.unlock?.();
      if(withFanfare){a?.cue?.('reveal');}
      a?.setMusic?.(true);
      stage.classList.add('is-starting');
      window.setTimeout(()=>{
        stage.classList.remove('is-starting','is-attract');
        stage.dataset.intro='done';
        lightRun();
      },reducedMotion()?0:380);
    }
    function syncScreen(){
      const isMenu=arkade.getScreen()==='MAIN_MENU';
      hotspots.setAttribute('aria-hidden',String(!isMenu));
      dock.setAttribute('aria-hidden',String(!isMenu));
      stage.classList.toggle('is-menu',isMenu);
    }
    stage.addEventListener('click',(event)=>{
      if(event.target.closest('.pm-press-start')){endAttract();return;}
      const button=event.target.closest('[data-art-action]');
      if(button){
        const index=actions.findIndex(a=>a.id===button.dataset.artAction);
        if(index>=0){
          if(attract)endAttract(false);
          setSelection(index);activate(actions[index].id);
        }
      }else if(attract)endAttract();
    });
    stage.addEventListener('pointerover',(event)=>{
      if(arkade.getScreen()!=='MAIN_MENU'||attract||busy)return;
      const button=event.target.closest('[data-art-action]');
      if(button){
        const index=actions.findIndex(a=>a.id===button.dataset.artAction);
        if(index>=0 && index!==selected){setSelection(index);window.NoahsAudio?.cue('move');}
      }
    });
    window.addEventListener('keydown',(event)=>{
      if(arkade.getScreen()!=='MAIN_MENU'||event.altKey||event.ctrlKey||event.metaKey)return;
      const key=event.key;
      if(attract){
        if(['Shift','Tab','CapsLock'].includes(key))return;
        event.preventDefault();event.stopImmediatePropagation();
        if(event.repeat)return;
        endAttract();
        return;
      }
      if(busy){event.preventDefault();event.stopImmediatePropagation();return;}
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','s','S'].includes(key)){
        event.preventDefault();event.stopImmediatePropagation();
        setSelection(selected+(['ArrowUp','ArrowLeft','w','W'].includes(key)?-1:1),true);
        window.NoahsAudio?.cue('move');
      }else if(key==='Enter'||key===' '){
        event.preventDefault();event.stopImmediatePropagation();
        if(event.repeat)return;
        const focused=event.target.closest?.('[data-art-action]')?.dataset.artAction;
        activate(focused||actions[selected].id);
      }else if(key==='Escape'||key==='Backspace'){
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
    window.addEventListener('arkade:screenchange',syncScreen);
    setSelection(0);
    arkade.showPaintedMenu();
    syncScreen();

    // First visit this session with full motion: power on, then wait for PRESS START.
    let seen=false;
    try{seen=sessionStorage.getItem(INTRO_KEY)==='1';}catch{}
    if(!seen && !reducedMotion() && !new URLSearchParams(location.search).has('skipintro')){
      attract=true;
      stage.classList.add('is-attract');
      stage.dataset.intro='off';
      window.setTimeout(()=>{stage.dataset.intro='beam';},120);
      window.setTimeout(()=>{stage.dataset.intro='reveal';},520);
      window.setTimeout(()=>{if(attract)stage.dataset.intro='title';},1900);
    }else{
      stage.dataset.intro='done';
    }
  };
  let chunksAttempted=false;
  art.onerror=()=>{
    if(chunksAttempted)return;
    chunksAttempted=true;
    // GitHub's text API preserves this image as exact PNG bytes split into
    // base64 fragments. Decode in the browser without re-encoding any pixels.
    (async()=>{
      try {
        const parts=await Promise.all(Array.from({length:20},async(_,i)=>{
          const name='part-'+String(i).padStart(2,'0')+'.txt';
          const response=await fetch('./assets/approved-menu-png/'+name);
          if(!response.ok)throw Error('Missing approved artwork fragment: '+name);
          return response.text();
        }));
        const encoded=parts.join('');
        if(encoded.length!==4226700)throw Error('Approved artwork is incomplete');
        const binary=atob(encoded);
        if(binary.length!==3170023)throw Error('Approved artwork byte size changed');
        const bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
        const imageUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
        art.addEventListener('load',()=>URL.revokeObjectURL(imageUrl),{once:true});
        art.src=imageUrl;
      }catch(error){
        console.warn('Approved artwork could not load; retaining the original menu.',error);
      }
    })();
  };
  art.src=ART;
})();
