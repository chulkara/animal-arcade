/* Experimental Tiger model swap: preserve approved menu & battle logic.
 * Model bytes are local/bundled CC BY 4.0 GLBs; this script never uploads files.
 * The left/right 3D portraits are optional until both verified models are present.
 */
(function(){
  'use strict';
  const game=document.getElementById('game');
  if(!game || !window.NoahsTigerSwapCore)return;
  const {createTransition}=window.NoahsTigerSwapCore;
  const sampleAction=window.NoahsTigerActionCore?.sampleAction;
  if(!sampleAction)return;
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
      '<button type="button" data-tiger-preview="run">RUN</button>'+
      '<button type="button" data-tiger-action="attack" data-technique="G">GUTS ATTACK</button>'+
      '<button type="button" data-tiger-action="attack" data-technique="T">TECHNIQUE</button>'+
      '<button type="button" data-tiger-action="attack" data-technique="P">POWER ATTACK</button>'+
      '<button type="button" data-tiger-action="attack" data-special="true">SPECIAL</button>'+
      '<button type="button" data-tiger-action="hurt">HIT REACTION</button>'+
      '<button type="button" data-tiger-action="ko">KNOCKOUT</button>'+
      '<button type="button" data-tiger-action="victory">VICTORY</button></div>'+
      '<p class="ark-tiger-status" data-tiger-status role="status">'+
      (loaded?'Models ready. Try Idle, Howl and Run.':'Choose two .glb files or install them under assets/3d/ to load automatically.')+
      '</p><p class="ark-tiger-warning">Procedural pose staging; not final hand-animated attacks. The other animal stays illustrated; Bear is planned after Tiger. Files stay local. Three.js requires a CDN connection.</p>';
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
    // Both GLBs face down their +Z axis after runner normalization.
    // View from the opposite side so the left fighter faces center-screen.
    camera.position.set(-7.1,3.1,1.1);camera.lookAt(0,1.1,0);
    const motionRoot=new THREE.Group();scene.add(motionRoot);
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
      motionRoot.add(positionRoot);
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
    // The native donor points the opposite way from the high-detail hero.
    // Turn its root 180°, not the entire canvas, so both face the opponent.
    runner.root.rotation.y=Math.PI;
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

    let activeHero=idleAction,mode='idle',previewMode='idle',activeCue=null,thenCue=null;
    let lastWidth=0,lastHeight=0,sequenceId=0;
    const transition=createTransition(reduced()?0:180);
    const axisX=new THREE.Vector3(1,0,0),axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1);
    const twist=new THREE.Quaternion();
    const boneNames={
      head:'c_head_00_uJnt_105',neck:'c_neck_00_uJnt_108',
      chest:'c_chest_00_uJnt_111',jaw:'c_jaw_00_uJnt_94',
      left:'l_femurRibbonFront_00_uJnt_54',
      right:'r_femurRibbonFront_00_uJnt_67',
      tail:'c_tail_00_uJnt_7'
    };
    const bones=Object.fromEntries(Object.entries(boneNames)
      .map(([key,name])=>[key,hero.body.getObjectByName(name)]));
    function changeHero(next){
      if(activeHero===next)return;
      next.enabled=true;next.reset().play();
      if(reduced()){activeHero.stop();next.weight=1;}
      else activeHero.crossFadeTo(next,.18,false);
      activeHero=next;
    }
    function setMode(next){
      if(next===mode)return;
      if(next==='howl')changeHero(howlAction);
      else changeHero(idleAction);
      transition.set(next);mode=next;
      if(next==='run')runAction.reset().play();
    }
    function play(next,temporary=true){
      if(!['idle','howl','run'].includes(next))return;
      activeCue=null;thenCue=null;sequenceId++;
      previewMode=next;setMode(next);
      if(temporary&&next!=='idle'){
        const stamp=sequenceId,delay=next==='run'?800:1500;
        window.setTimeout(()=>{if(sequenceId===stamp)play('idle',false);},reduced()?0:delay);
      }
    }
    function perform(kind,options={}){
      if(!['attack','hurt','ko','victory'].includes(kind))return;
      sequenceId++;previewMode='idle';
      activeCue={kind,technique:options.technique||'G',
        special:Boolean(options.special),started:performance.now()};
      thenCue=options.after||null;
      setMode(sampleAction(kind,0,activeCue).mode);
    }
    function twistBone(bone,axis,angle){
      if(bone&&Math.abs(angle)>0.00001)bone.quaternion.multiply(twist.setFromAxisAngle(axis,angle));
    }
    function applyPose(pose){
      const sign=slot===0?1:-1;
      // Deliberately bounded additive acting on the hero rig. This improves
      // readability but is not a substitute for hand-keyed quadruped motion.
      // Both tigers travel forward along +Z. The right viewport is mirrored
      // by CSS, so both appear to charge toward the opponent.
      motionRoot.position.set(0,pose.lift,pose.travel);
      motionRoot.rotation.set(pose.pitch*.38,0,sign*pose.roll*.65);
      twistBone(bones.chest,axisZ,sign*pose.pitch*.28);
      twistBone(bones.neck,axisX,pose.neck*.50);
      twistBone(bones.head,axisX,pose.head*.46);
      twistBone(bones.head,axisY,sign*pose.headYaw*.38);
      twistBone(bones.jaw,axisX,-pose.jaw*.35);
      twistBone(bones.left,axisX,pose.foreleg*.40);
      twistBone(bones.right,axisX,-pose.foreleg*.35);
      twistBone(bones.tail,axisY,sign*pose.tail*.25);
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
      let pose={travel:0,lift:0,pitch:0,roll:0,neck:0,head:0,headYaw:0,jaw:0,foreleg:0,tail:0};
      if(activeCue){
        const sampled=sampleAction(activeCue.kind,Math.max(0,time-activeCue.started),{
          technique:activeCue.technique,special:activeCue.special,
          reducedMotion:reduced()
        });
        pose=sampled.pose;
        setMode(sampled.mode);
        if(sampled.complete&&activeCue.kind!=='ko'){
          const after=thenCue;activeCue=null;thenCue=null;
          if(after)perform(after);
          else {previewMode='idle';setMode('idle');}
        }
      }else setMode(previewMode);
      const opacity=transition.advance(reduced()?1000:dt*1000);
      setOpacity(hero,opacity.heroOpacity);setOpacity(runner,opacity.runnerOpacity);
      applyPose(pose);
      renderer.render(scene,camera);
    }
    return {slot,host,play,perform,layout,tick,dispose(){
      sequenceId++;
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
    const wasInBattle=runningScreen;
    runningScreen=inBattle;
    if(!inBattle){
      if(wasInBattle)for(const actor of actors)actor.play('idle',false);
      layers&&(layers.hidden=true);closeLab();lastHit='';return;
    }
    if(!loaded){attemptAuto();return;}
    const fighters=[...document.querySelectorAll('.combat-fighter[data-tiger-slot]')];
    const tigerSlots=fighters.filter(node=>node.dataset.tigerId==='tiger')
      .map(node=>Number(node.dataset.tigerSlot));
    // Avoid allocating a second 3D renderer when the other fighter is
    // illustrated. Also rebuild actors when a new match changes the roster.
    if(actors.length!==tigerSlots.length||
       actors.some(actor=>!tigerSlots.includes(actor.slot))){
      disposeActors();lastHit='';
      if(tigerSlots.length){
        try{for(const slot of tigerSlots)actors.push(createActor(slot));}
        catch(e){disposeActors();status('3D rendering unavailable: '+(e?.message||e),true);return;}
      }
    }
    if(!layers)return;
    layers.hidden=false;
    const state=combat();
    for(const actor of actors){
      const fighter=fighters.find(el=>Number(el.dataset.tigerSlot)===actor.slot);
      actor.host.hidden=!fighter;
      if(fighter)fighter.classList.add('ark-tiger-3d-live');
    }
    if(state?.lastEvent?.kind==='HIT'){
      const ev=state.lastEvent;
      const key=[state.session.bout,state.round,ev.attacker,ev.defender,ev.damage,ev.remainingHp].join(':');
      if(key!==lastHit){
        lastHit=key;
        if(state.animals[ev.attacker]?.id==='tiger'){
          actors.find(actor=>actor.slot===ev.attacker)?.perform('attack',{
            technique:ev.technique,special:Boolean(ev.special),
            after:state.phase==='FINISHED'&&state.winner===ev.attacker?'victory':null
          });
        }
        if(state.animals[ev.defender]?.id==='tiger'){
          actors.find(actor=>actor.slot===ev.defender)?.perform(state.animals[ev.defender].hp<=0?'ko':'hurt');
        }
      }
    }else if(!state?.lastEvent && lastHit){
      // The next exchange/bout must never inherit a previous KO/attack pose.
      lastHit='';
      for(const actor of actors)actor.play('idle',false);
    }
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
      // Align canvas to the original portrait artwork, not the entire fighter HUD.
      const art=target.querySelector('.combat-fighter-art');
      actor.layout((art||target).getBoundingClientRect(),gameRect);
      actor.tick(dt,time);
    }
    raf=requestAnimationFrame(draw);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-tiger-lab-toggle]')){openLab();return;}
    if(e.target.closest('[data-tiger-close]')){closeLab();return;}
    const actionButton=e.target.closest('[data-tiger-action]');
    if(actionButton){if(!loaded){status('Load both GLBs first.',true);return;}
      for(const actor of actors)actor.perform(actionButton.dataset.tigerAction,{
        technique:actionButton.dataset.technique||'G',special:actionButton.dataset.special==='true'
      });
      status('Previewing '+actionButton.textContent.trim()+' motion staging…');return;}
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
