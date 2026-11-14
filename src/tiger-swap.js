/* Experimental Tiger model swap: preserve approved menu & battle logic.
 * Model bytes are local/bundled CC BY 4.0 GLBs; this script never uploads files.
 * The left/right 3D portraits are optional until both verified models are present.
 */
(function(){
  'use strict';
  const game=document.getElementById('game');
  if(!game || !window.NoahsTigerSwapCore)return;
  const {createTransition}=window.NoahsTigerSwapCore;
  const PATHS=Object.freeze({
    hero:'./assets/3d/tiger-idle-howl-orange.glb',
    runner:'./assets/3d/tiger-running.glb'
  });
  let modules=null,loaded=null,loadError='',loading=false,autoChecked=false;
  let layers=null,lab=null,actors=[],raf=0,lastTime=0,lastHit='',runningScreen=false;
  let userObjectUrls=[];
  const maxBytes=30*1024*1024;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||
    Boolean(window.__arkade?.getSettings()?.reducedMotion);
  const nowScreen=()=>window.__arkade?.getScreen();
  const combat=()=>window.NoahsCombat?.getState();
  function status(message,isError=false){
    loadError=isError?message:'';
    if(lab){
      const line=lab.querySelector('[data-tiger-status]');
      if(line){line.textContent=message;line.dataset.error=isError?'true':'false';}
    }
  }
  function unloadUrls(){
    for(const url of userObjectUrls)URL.revokeObjectURL(url);
    userObjectUrls=[];
  }
  function openLab(){
    if(nowScreen()!=='BATTLE_PLAY')return;
    if(lab){lab.querySelector('input')?.focus();return;}
    lab=document.createElement('section');
    lab.className='ark-tiger-lab';lab.setAttribute('role','dialog');
    lab.setAttribute('aria-modal','true');lab.setAttribute('aria-label','3D Tiger motion lab');
    lab.innerHTML='<div class="ark-tiger-lab-head"><h2>3D TIGER · MOTION LAB</h2><button type="button" data-tiger-close aria-label="Close 3D tiger lab">✕</button></div>'+
      '<p>Use the orange high-detail model for <b>Idle / Howl</b> and the native running tiger for <b>Run</b>. File selections stay on this device.</p>'+
      '<label>ORANGE TIGER · IDLE + HOWL <input data-tiger-hero type="file" accept=".glb,model/gltf-binary"></label>'+
      '<label>RUNNING TIGER · RUN <input data-tiger-run type="file" accept=".glb,model/gltf-binary"></label>'+
      '<div class="ark-tiger-lab-actions"><button type="button" data-tiger-load>LOAD BOTH MODELS</button>'+
      '<button type="button" data-tiger-preview="idle">IDLE</button>'+
      '<button type="button" data-tiger-preview="howl">HOWL</button>'+
      '<button type="button" data-tiger-preview="run">RUN</button></div>'+
      '<p class="ark-tiger-status" data-tiger-status role="status">'+
      (loaded?'Models ready. Try Idle, Howl and Run.':'Choose two .glb files or install them under assets/3d/ to load automatically.')+
      '</p><p class="ark-tiger-warning">Experimental staging, not final combat animation. The lion stays illustrated; no model is sent to a server. Three.js loads from the CDN when 3D is enabled.</p>';
    game.append(lab);
    lab.querySelector('input')?.focus();
  }
  function closeLab(){lab?.remove();lab=null;}
  async function dependencies(){
    if(modules)return modules;
    const [THREE,{GLTFLoader},{clone}]=await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/utils/SkeletonUtils.js')
    ]);
    modules={THREE,GLTFLoader,clone};
    return modules;
  }
  function validate(gltf,match,label){
    if(!gltf?.scene || !gltf.animations?.some(a=>match.test(a.name)))
      throw new Error(label+' is not a compatible animated tiger GLB.');
  }
  async function loadPair(heroUrl,runUrl){
    if(loading)return;
    loading=true;status('Loading model geometry and native clips…');
    try{
      const {GLTFLoader}=await dependencies();
      const loader=new GLTFLoader();
      const [hero,runner]=await Promise.all([loader.loadAsync(heroUrl),loader.loadAsync(runUrl)]);
      validate(hero,/^Idle$/i,'Orange tiger');
      validate(hero,/Howl/i,'Orange tiger (Howl)');
      validate(runner,/Run/i,'Running tiger');
      loaded={hero,runner};
      disposeActors();
      status('Models loaded. Idle / Howl use the recolored hero; Run uses the native runner.');
      sync();
    }catch(e){
      status('3D could not load: '+(e?.message||String(e))+'. Illustrated fighters are preserved.',true);
    }finally{loading=false;}
  }
  async function attemptAuto(){
    if(autoChecked||loaded||loading)return;
    autoChecked=true;
    try{
      const results=await Promise.all(Object.values(PATHS).map(url=>
        fetch(url,{method:'HEAD',cache:'no-store'})));
      if(results.every(response=>response.ok))await loadPair(PATHS.hero,PATHS.runner);
    }catch{ /* Development preview still supports manual local uploads. */ }
  }
  function disposeActors(){
    for(const actor of actors)actor.dispose();
    actors=[];
    if(layers){layers.remove();layers=null;}
    document.querySelectorAll('.ark-tiger-3d-live').forEach(node=>node.classList.remove('ark-tiger-3d-live'));
    if(raf){cancelAnimationFrame(raf);raf=0;}
  }
  function createActor(slot){
    const {THREE,clone}=modules;
    if(!layers){
      layers=document.createElement('div');
      layers.className='ark-tiger-3d-layers';
      layers.setAttribute('aria-hidden','true');
      game.append(layers);
    }
    const host=document.createElement('div');
    host.className='ark-tiger-3d-slot';host.dataset.slot=String(slot);
    const canvas=document.createElement('canvas');host.append(canvas);layers.append(host);
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    const scene=new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffe9ce,1.5));
    const key=new THREE.DirectionalLight(0xffe5c0,3.0);key.position.set(-4,8,6);scene.add(key);
    const fill=new THREE.DirectionalLight(0xb9cfdf,1.1);fill.position.set(2,4,-6);scene.add(fill);
    const camera=new THREE.PerspectiveCamera(34,1,.01,100);
    camera.position.set(7.1,3.1,1.1);camera.lookAt(0,1.1,0);
    function addModel(gltf){
      const sceneRoot=clone(gltf.scene);
      const bounds=new THREE.Box3().setFromObject(sceneRoot);
      const dimensions=bounds.getSize(new THREE.Vector3());
      const center=bounds.getCenter(new THREE.Vector3());
      const length=Math.max(dimensions.x,dimensions.z);
      if(!Number.isFinite(length)||length<.001)throw new Error('Invalid tiger geometry bounds');
      // Preserve source aspect ratios. Match nose-to-tail stage length, then ground.
      const scale=4.2/length;
      const positionRoot=new THREE.Group();
      positionRoot.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
      positionRoot.scale.setScalar(scale);
      positionRoot.add(sceneRoot);
      scene.add(positionRoot);
      const materials=[];
      sceneRoot.traverse(object=>{
        if(!object.isMesh)return;
        const cloneMaterial=mat=>{
          const m=mat.clone();m.transparent=true;m.opacity=1;
          materials.push(m);return m;
        };
        object.material=Array.isArray(object.material)?
          object.material.map(cloneMaterial):cloneMaterial(object.material);
        object.frustumCulled=false;
      });
      return {root:positionRoot,body:sceneRoot,materials,scale,dimensions};
    }
    const hero=addModel(loaded.hero),runner=addModel(loaded.runner);
    const heroMixer=new THREE.AnimationMixer(hero.body);
    const runnerMixer=new THREE.AnimationMixer(runner.body);
    const idleClip=loaded.hero.animations.find(a=>/^Idle$/i.test(a.name));
    const howlClip=loaded.hero.animations.find(a=>/Howl/i.test(a.name));
    const runClip=loaded.runner.animations.find(a=>/Run/i.test(a.name));
    const idleAction=heroMixer.clipAction(idleClip),howlAction=heroMixer.clipAction(howlClip);
    const runAction=runnerMixer.clipAction(runClip);
    idleAction.setLoop(THREE.LoopRepeat,Infinity).play();
    runAction.setLoop(THREE.LoopRepeat,Infinity).play();
    howlAction.setLoop(THREE.LoopOnce,1);howlAction.clampWhenFinished=true;
    let activeHero=idleAction,mode='idle',motionStart=0,motionDuration=0,stopMode=0;
    let lastWidth=0,lastHeight=0;
    const transition=createTransition(reduced()?0:250);
    function changeHero(next){
      if(activeHero===next)return;
      next.enabled=true;next.reset().play();
      if(reduced()){activeHero.stop();next.weight=1;}
      else activeHero.crossFadeTo(next,.20,false);
      activeHero=next;
    }
    function play(next,temporary=true){
      if(!['idle','howl','run'].includes(next))return;
      if(stopMode){clearTimeout(stopMode);stopMode=0;}
      if(next==='howl')changeHero(howlAction);
      else changeHero(idleAction);
      transition.set(next);mode=next;
      if(next==='run')runAction.reset().play();
      motionStart=performance.now();motionDuration=next==='run'?580:0;
      if(temporary&&next!=='idle'){
        const duration=next==='run'?580:Math.min(1900,Math.max(900,howlClip.duration*850));
        stopMode=window.setTimeout(()=>play('idle',false),reduced()?0:duration);
      }
    }
    function setOpacity(model,opacity){
      model.root.visible=opacity>.001;
      for(const mat of model.materials){
        mat.opacity=Math.max(0,Math.min(1,opacity));
        mat.depthWrite=opacity>.97;
      }
    }
    function layout(rect,outer){
      if(!rect||rect.width<1||rect.height<1){host.hidden=true;return;}
      host.hidden=false;
      host.style.left=(rect.left-outer.left)+'px';
      host.style.top=(rect.top-outer.top)+'px';
      host.style.width=rect.width+'px';
      host.style.height=rect.height+'px';
      const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
      if(w!==lastWidth||h!==lastHeight){
        lastWidth=w;lastHeight=h;
        renderer.setSize(w,h,false);
        camera.aspect=w/h;camera.updateProjectionMatrix();
      }
    }
    function tick(dt,time){
      heroMixer.update(dt);runnerMixer.update(dt);
      const state=transition.advance(reduced()?250:dt*1000);
      setOpacity(hero,state.heroOpacity);setOpacity(runner,state.runnerOpacity);
      if(mode==='run'&&motionDuration>0&&!reduced()){
        const p=Math.min(1,(time-motionStart)/motionDuration);
        const travel=Math.sin(p*Math.PI)*Math.min(48,lastWidth*.12)*(slot===0?1:-1);
        host.style.translate=travel.toFixed(1)+'px 0';
      }else host.style.translate='0 0';
      renderer.render(scene,camera);
    }
    return {slot,host,play,layout,tick,dispose(){
      if(stopMode)clearTimeout(stopMode);
      heroMixer.stopAllAction();runnerMixer.stopAllAction();
      heroMixer.uncacheRoot(hero.body);runnerMixer.uncacheRoot(runner.body);
      for(const model of [hero,runner]){
        model.root.traverse(node=>{
          if(node.isMesh){
            if(Array.isArray(node.material))node.material.forEach(mat=>mat.dispose());
            else node.material?.dispose();
          }
        });
      }
      renderer.dispose();host.remove();
    }};
  }
  function sync(){
    const inBattle=nowScreen()==='BATTLE_PLAY';
    runningScreen=inBattle;
    if(!inBattle){layers&&(layers.hidden=true);closeLab();lastHit='';return;}
    if(!loaded){attemptAuto();return;}
    if(!actors.length){
      try{actors=[createActor(0),createActor(1)];}
      catch(e){disposeActors();status('3D rendering unavailable: '+(e?.message||e),true);return;}
    }
    layers.hidden=false;
    const fighters=document.querySelectorAll('.combat-fighter[data-tiger-slot]');
    const state=combat();
    for(const actor of actors){
      const fighter=[...fighters].find(el=>Number(el.dataset.tigerSlot)===actor.slot);
      const tiger=fighter?.dataset.tigerId==='tiger';
      actor.host.hidden=!tiger;
      if(tiger)fighter.classList.add('ark-tiger-3d-live');
    }
    if(state?.lastEvent?.kind==='HIT'){
      const ev=state.lastEvent;
      const key=[state.session.bout,state.round,ev.attacker,ev.defender,ev.damage,ev.remainingHp].join(':');
      if(key!==lastHit){
        lastHit=key;
        if(state.animals[ev.attacker]?.id==='tiger'){
          actors[ev.attacker].play(ev.special?'howl':'run');
        }
      }
    }else if(!state?.lastEvent)lastHit='';
    if(!raf){lastTime=performance.now();raf=requestAnimationFrame(draw);}
  }
  function draw(time){
    raf=0;
    if(!runningScreen||!loaded||document.hidden)return;
    const dt=Math.min(.05,Math.max(0,(time-lastTime)/1000));lastTime=time;
    const gameRect=game.getBoundingClientRect();
    const fighters=document.querySelectorAll('.combat-fighter[data-tiger-slot]');
    for(const actor of actors){
      const target=[...fighters].find(el=>Number(el.dataset.tigerSlot)===actor.slot&&el.dataset.tigerId==='tiger');
      if(!target){actor.host.hidden=true;continue;}
      actor.layout(target.getBoundingClientRect(),gameRect);
      actor.tick(dt,time);
    }
    raf=requestAnimationFrame(draw);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-tiger-lab-toggle]')){openLab();return;}
    if(e.target.closest('[data-tiger-close]')){closeLab();return;}
    const preview=e.target.closest('[data-tiger-preview]');
    if(preview){if(!loaded){status('Load both GLBs first.',true);return;}
      for(const actor of actors)actor.play(preview.dataset.tigerPreview,false);return;}
    if(e.target.closest('[data-tiger-load]')){
      const heroFile=lab?.querySelector('[data-tiger-hero]')?.files?.[0];
      const runFile=lab?.querySelector('[data-tiger-run]')?.files?.[0];
      if(!heroFile||!runFile){status('Select BOTH .glb files.',true);return;}
      if(![heroFile,runFile].every(file=>file.name.toLowerCase().endsWith('.glb')&&file.size<=maxBytes)){
        status('Each file must be a .glb smaller than 30 MB.',true);return;
      }
      unloadUrls();
      userObjectUrls=[URL.createObjectURL(heroFile),URL.createObjectURL(runFile)];
      loadPair(userObjectUrls[0],userObjectUrls[1]);return;
    }
  });
  window.addEventListener('keydown',e=>{
    if(!lab)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeLab();}
  },true);
  window.addEventListener('arkade:screenchange',sync);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&runningScreen&&!raf){lastTime=performance.now();raf=requestAnimationFrame(draw);}
  });
  window.addEventListener('beforeunload',()=>{disposeActors();unloadUrls();});
  window.NoahsTigerSwap={openLab,loadPair,getStatus:()=>({
    assetsLoaded:!!loaded,error:loadError,
    clips:loaded?{hero:loaded.hero.animations.map(a=>a.name),runner:loaded.runner.animations.map(a=>a.name)}:null
  })};
})();
