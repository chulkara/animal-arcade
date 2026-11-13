/* Exact-art menu overlay: rendered only if the approved original PNG is present.
   No image manipulation, crop, filters, re-lettering, or synthetic replacements. */
(function () {
  'use strict';
  const game=document.getElementById('game');
  const arkade=window.__arkade;
  if(!game||!arkade)return;
  const ART='./assets/approved-menu.png';
  const actions=[
    {id:'PLAY',label:'Play',x:38.1,y:52.3,w:23.4,h:6.8},
    {id:'MY_CARDS',label:'My Cards',x:38.4,y:60.6,w:22.1,h:5.7},
    {id:'BINDER',label:'Binder',x:38.4,y:67.5,w:22.1,h:5.7},
    {id:'SHOP',label:'Shop',x:38.4,y:74.2,w:22.1,h:5.8},
    {id:'SETTINGS',label:'Settings',x:38.4,y:81.0,w:22.1,h:5.8}
  ];
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
    for(const item of actions){
      const hotspot=document.createElement('button');
      hotspot.type='button';
      hotspot.className='painted-hotspot';
      hotspot.dataset.artAction=item.id;
      hotspot.setAttribute('aria-label',item.label);
      hotspot.style.left=item.x+'%';
      hotspot.style.top=item.y+'%';
      hotspot.style.width=item.w+'%';
      hotspot.style.height=item.h+'%';
      hotspots.appendChild(hotspot);
      const mobile=document.createElement('button');
      mobile.type='button';
      mobile.className='painted-mobile-button';
      mobile.dataset.artAction=item.id;
      mobile.textContent=item.label.toUpperCase();
      dock.appendChild(mobile);
    }
    stage.append(art,hotspots,dock);
    game.appendChild(stage);
    game.classList.add('painted-enabled','intro-complete');
    let selected=0;
    const controls=[...stage.querySelectorAll('[data-art-action]')];
    function setSelection(index,focus=false){
      selected=(index+actions.length)%actions.length;
      for(const button of controls){
        const active=button.dataset.artAction===actions[selected].id;
        button.classList.toggle('active',active);
        button.setAttribute('aria-current',active?'true':'false');
        button.tabIndex=active?0:-1;
      }
      if(focus){
        const useDock=window.matchMedia('(max-aspect-ratio: 4/5)').matches;
        const selector=useDock?'.painted-mobile-button.active':'.painted-hotspot.active';
        stage.querySelector(selector)?.focus({preventScroll:true});
      }
    }
    function activate(action){
      if(arkade.getScreen()!=='MAIN_MENU')return;
      arkade.openPainted(action);
    }
    function syncScreen(){
      const isMenu=arkade.getScreen()==='MAIN_MENU';
      hotspots.setAttribute('aria-hidden',String(!isMenu));
      dock.setAttribute('aria-hidden',String(!isMenu));
    }
    stage.addEventListener('click',(event)=>{
      const button=event.target.closest('[data-art-action]');
      if(button){
        const index=actions.findIndex(a=>a.id===button.dataset.artAction);
        if(index>=0){setSelection(index);activate(actions[index].id);}
      }
    });
    stage.addEventListener('pointerover',(event)=>{
      if(arkade.getScreen()!=='MAIN_MENU')return;
      const button=event.target.closest('[data-art-action]');
      if(button){
        const index=actions.findIndex(a=>a.id===button.dataset.artAction);
        if(index>=0 && index!==selected)setSelection(index);
      }
    });
    window.addEventListener('keydown',(event)=>{
      if(arkade.getScreen()!=='MAIN_MENU'||event.altKey||event.ctrlKey||event.metaKey)return;
      const key=event.key;
      if(['ArrowUp','ArrowDown','w','W','s','S'].includes(key)){
        event.preventDefault();event.stopImmediatePropagation();
        setSelection(selected+(['ArrowUp','w','W'].includes(key)?-1:1),true);
        window.NoahsAudio?.cue('move');
      }else if(key==='Enter'||key===' '){
        event.preventDefault();event.stopImmediatePropagation();
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
  };
  art.onerror=()=>{/* The original menu remains fully functional until art is uploaded. */};
  art.src=ART;
})();
