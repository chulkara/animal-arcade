/* Local-only, rigged 3D battle stage. No private FBX or texture bytes are
 * fetched from this public site or transmitted to a server. */
(function(){
  'use strict';
  const core=window.NoahsArena3DCore,loader=window.NoahsArena3DLoader;
  const cinematics=window.NoahsCinematicCore;
  const game=document.getElementById('game'),ui=document.getElementById('ui');
  if(!core||!loader||!game||!ui)return;
  const selected={bear:null,moose:null},loaded={bear:null,moose:null};
  const yaw={bear:0,moose:0};
  let panel=null,stage=null,layer=null,THREE=null,renderer=null,scene=null,camera=null,layout=null;
  let actors=[null,null],running=0,lastFrame=0,shownEvent=null,sequence=null,loading=false;
  let cameraLook=null,fxGroup=null,fxParticles=[],fxGeometry=null,fxMaterials=[];
  let message='Choose an extracted private Motion Lab folder. The files stay on this device.';
  const screen=()=>window.__arkade?.getScreen();
  const state=()=>window.NoahsCombat?.getState();
  const reduced=()=>Boolean(window.__arkade?.getSettings()?.reducedMotion)||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const label=id=>id==='bear'?'BROWN BEAR':'MOUNTAIN MOOSE';
  function status(msg){
    message=msg;
    const node=panel?.querySelector('[data-ark3d-status]');
    if(node)node.textContent=msg;
  }
  function openPanel(){
    if(screen()!=='BATTLE_PLAY')return;
    if(panel){panel.querySelector('[data-ark3d-close]')?.focus();return;}
    panel=document.createElement('section');
    panel.className='ark-fbx-dialog';panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','ark-fbx-title');
    panel.innerHTML='<div class="ark-fbx-dialog-head"><h2 id="ark-fbx-title">BEAR + MOOSE · 3D ARENA</h2>'+
      '<button type="button" data-ark3d-close aria-label="Close 3D arena setup">✕</button></div>'+
      '<p>Import your <b>extracted, private Motion Lab V2</b> folders. The model, native motions, and brown-coat textures are read locally, not uploaded. The title painting remains unchanged.</p>'+
      ['bear','moose'].map(id=>'<div class="ark-fbx-import" data-ark3d-species="'+id+'">'+
        '<strong>'+label(id)+'</strong><small data-ark3d-loaded="'+id+'">'+
        (loaded[id]?'3D assets loaded':'Waiting for private model + motion files')+'</small>'+
        '<label>CHOOSE EXTRACTED FOLDER <input type="file" data-ark3d-folder="'+id+'" webkitdirectory multiple></label>'+
        '<label>OR SELECT ALL MODEL / MOTION / TEXTURE FILES <input type="file" data-ark3d-files="'+id+'" accept=".fbx,.FBX,.png,.PNG,.jpg,.jpeg,.webp" multiple></label>'+
        '<div class="ark-fbx-import-actions"><button type="button" data-ark3d-load="'+id+'">LOAD '+id.toUpperCase()+'</button>'+
        '<button type="button" data-ark3d-turn="'+id+'">TURN '+id.toUpperCase()+' 90°</button>'+
        '<button type="button" data-ark3d-unload="'+id+'">REMOVE</button></div></div>').join('')+
      '<p class="ark-fbx-status" data-ark3d-status role="status"></p>'+
      '<p class="ark-fbx-legal">Local preview only. The supplied models have unverified public/commercial redistribution rights and are not shipped by this site. Extract ZIPs before choosing a folder.</p>';
    game.append(panel);
    status(message);
    panel.querySelector('[data-ark3d-close]')?.focus();
  }
  function closePanel(){panel?.remove();panel=null;}
  function resetApplied(actor){
    for(const [bone,quaternion] of actor.additive)bone.quaternion.copy(quaternion);
    actor.additive.clear();
  }
  function makeActor(id,slot){
    const asset=loaded[id];
    if(!asset||!THREE||!layout)return null;
    const model=asset.clone(asset.model);
    const geometry=new THREE.Group(),pivot=new THREE.Group(),orientation=new THREE.Group();
    geometry.add(model);orientation.add(geometry);pivot.add(orientation);layout.add(pivot);
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<.0001)throw Error('Cannot fit '+id+' skeleton to the 3D stage');
    const scale=Math.min(2.75/size.y,3.1/Math.max(size.x,.001),3.1/Math.max(size.z,.001));
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    const fitted=new THREE.Box3().setFromObject(model);
    const center=fitted.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-fitted.min.y,-center.z);
    pivot.position.x=slot===0?-2.02:2.02;
    orientation.rotation.y=(slot===0?Math.PI/2:-Math.PI/2)+yaw[id];
    const mixer=new THREE.AnimationMixer(model),joint=new Map();
    model.traverse(node=>{if(node.isBone)joint.set(node.name,node);});
    const actor={id,slot,asset,model,pivot,orientation,mixer,joint,additive:new Map(),
      current:null,currentKey:null,proc:null,procElapsed:0,baseX:pivot.position.x};
    actor.native=(key)=>{
      resetApplied(actor);actor.proc=null;actor.procElapsed=0;
      const name=asset.clips[key]?key:'idle',clip=asset.clips[name];
      if(!clip)return;
      if(actor.currentKey===name&&actor.current?.isRunning())return;
      const next=mixer.clipAction(clip,model);
      const previous=actor.current;
      if(previous&&previous!==next)previous.fadeOut(.15);
      next.reset();next.enabled=true;next.setEffectiveWeight(1);
      const oneShot=!['idle','run','breathing','jump','victory'].includes(name);
      next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);
      next.clampWhenFinished=name==='knockout';
      next.fadeIn(.15).play();
      actor.current=next;actor.currentKey=name;
    };
    actor.move=(move)=>{
      if(!['G','T','P','S'].includes(move))return;
      if(id==='bear'){actor.native(move);return;}
      const code={G:'Guts',T:'Technique',P:'Power',S:'Special'}[move];
      const base=window.NoahsMooseActionCore.MOVES[code].base.toLowerCase();
      actor.native(base);actor.proc=code;actor.procElapsed=0;
    };
    actor.pose=(pose)=>{
      const set=(name,axis,value)=>{
        const bone=joint.get(name);
        if(!bone||!Number.isFinite(value)||Math.abs(value)<.0001)return;
        if(!actor.additive.has(bone))actor.additive.set(bone,bone.quaternion.clone());
        const q=new THREE.Quaternion().setFromAxisAngle(axis,value);
        bone.quaternion.multiply(q);
      };
      const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
      set('RigPelvis',X,pose.pelvis*.7);
      set('RigSpine1',X,pose.chest*.6);
      set('RigChest',X,pose.chest*.6);
      set('RigNeck',X,pose.neck*.6);
      set('RigHead',X,pose.headPitch*.7);
      set('RigHead',Y,pose.headYaw*.6);
      set('RigTail',X,pose.tail*.6);
      set('RigLFLeg1',X,pose.leftHoof*.56);
      set('RigRFLeg1',X,pose.rightHoof*.56);
      set('RigLBLeg1',X,pose.leftHindHip*.85);
      set('RigRBLeg1',X,pose.rightHindHip*.85);
      set('RigLBLeg2',X,pose.leftHindKnee*.8);
      set('RigRBLeg2',X,pose.rightHindKnee*.8);
      set('RigLBLeg3',X,pose.leftHindHock*.8);
      set('RigRBLeg3',X,pose.rightHindHock*.8);
      set('RigLBLegAnkle',X,pose.leftHindAnkle*.7);
      set('RigRBLegAnkle',X,pose.rightHindAnkle*.7);
      orientation.rotation.y=(slot===0?Math.PI/2:-Math.PI/2)+yaw[id]+pose.yaw*.3;
      orientation.rotation.z=pose.roll*.5;
      orientation.rotation.x=pose.pitch*.55;
      pivot.position.x=actor.baseX+(slot===0?1:-1)*pose.travel*.55;
      pivot.position.z=pose.lateral*.35*(slot===0?1:-1);
      // Bounded ankle support correction for the reviewed V2 hind-leg stomp;
      // this is still experimental, not full-body IK/foot locking.
      pivot.position.y=pose.lift*.5-Math.max(0,pose.lift)*pose.hindPlant*.16;
    };
    actor.tick=(delta)=>{
      resetApplied(actor);
      mixer.update(reduced()?0:delta);
      if(actor.proc){
        actor.procElapsed+=reduced()?0:delta*1000;
        const sample=window.NoahsMooseActionCore.sampleMove(actor.proc,
          actor.procElapsed,{reducedMotion:reduced()});
        actor.pose(sample.pose);
      }
    };
    actor.idle=()=>{
      resetApplied(actor);actor.proc=null;actor.procElapsed=0;
      pivot.position.set(actor.baseX,0,0);
      orientation.rotation.set(0,(slot===0?Math.PI/2:-Math.PI/2)+yaw[id],0);
      actor.native('idle');
    };
    actor.destroy=()=>{resetApplied(actor);mixer.stopAllAction();layout.remove(pivot);};
    actor.idle();
    return actor;
  }
  async function createScene(){
    if(renderer)return;
    const deps=await loader.getDeps();
    THREE=deps.THREE;
    scene=new THREE.Scene();
    camera=new THREE.OrthographicCamera(-4,4,2.5,-2.5,.1,80);
    camera.position.set(0,3,12);cameraLook=new THREE.Vector3(0,1.18,0);
    camera.lookAt(cameraLook);
    layout=new THREE.Group();scene.add(layout);
    scene.add(new THREE.HemisphereLight(0xf6e4c0,0x344b4c,2.0));
    const sun=new THREE.DirectionalLight(0xffdeb0,3.4);
    sun.position.set(-4,8,5);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-7;sun.shadow.camera.right=7;
    sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;
    scene.add(sun);
    const fill=new THREE.DirectionalLight(0xb9d7d6,1.4);
    fill.position.set(5,3,-4);scene.add(fill);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(7,64),
      new THREE.ShadowMaterial({opacity:.18}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;
    floor.position.y=-.008;scene.add(floor);
    createEffects();
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.17;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden','true');
    renderer.domElement.addEventListener('webglcontextlost',event=>{
      event.preventDefault();status('WebGL context lost. Use the illustrated arena until it recovers.');
      stopLoop();clearCanvas();
    });
    layer=document.createElement('div');layer.className='ark-fbx-layer';
    layer.append(renderer.domElement);
  }
  function createEffects(){
    fxGroup=new THREE.Group();layout.add(fxGroup);
    fxGeometry=new THREE.IcosahedronGeometry(.085,0);
    for(let i=0;i<24;i++){
      const material=new THREE.MeshBasicMaterial({
        color:0xf5d8a3,transparent:true,opacity:0,depthWrite:false,
        blending:THREE.AdditiveBlending
      });
      const point=new THREE.Mesh(fxGeometry,material);
      point.scale.setScalar(.5);
      fxGroup.add(point);fxMaterials.push(material);fxParticles.push(point);
    }
    fxGroup.visible=false;
  }
  function paintEffects(){
    if(!fxGroup||reduced()){if(fxGroup)fxGroup.visible=false;return;}
    const live=window.NoahsCinematics?.getState();
    if(!live?.event){fxGroup.visible=false;return;}
    const {event,elapsed}=live;
    const timing=cinematics?.duration(event,nativeLength(event));
    const actionTime=elapsed-(timing?.miracleLead||0);
    const contact=timing?.contact||900;
    const miracle=cinematics?.miracle(event.miracleName);
    const miraclePhase=miracle&&elapsed<(timing?.miracleLead||0);
    const hitPhase=actionTime>=contact&&actionTime<contact+650;
    const victor=event.finished&&elapsed>=(timing?.victoryStart||Infinity);
    if(!miraclePhase&&!hitPhase&&!victor){fxGroup.visible=false;return;}
    fxGroup.visible=true;
    const home=event.attacker===0?-2.02:2.02;
    const target=event.defender===0?-2.02:2.02;
    const kind=miraclePhase?miracle.type:hitPhase?'dust':'triumph';
    const t=miraclePhase?elapsed/Math.max(1,timing.miracleLead):
      hitPhase?(actionTime-contact)/650:
      (elapsed-timing.victoryStart)/3800;
    const colors={starfall:0xffd28d,storm:0xb9d6ff,tide:0x78e8da,
      eclipse:0xd7a4ff,dawn:0xffce85,dust:0xded0b0,triumph:0xf8e5a7};
    for(let i=0;i<fxParticles.length;i++){
      const point=fxParticles[i],material=fxMaterials[i];
      const a=(i/24)*Math.PI*2,ring=i%4;
      const pulse=Math.sin((i*19.7+elapsed*.004))*0.5+0.5;
      let x=0,y=0,z=0,radius=.4,alpha=.5;
      if(kind==='starfall'){
        radius=.5+(i%5)*.15;
        x=home+Math.cos(a)*radius;
        y=.25+((1-t+i*.073)%1+1)%1*4.3;
        z=Math.sin(a)*radius;alpha=.3+.7*(1-t);
      }else if(kind==='storm'){
        x=home+Math.cos(a)*(.4+ring*.24);
        z=Math.sin(a)*(.4+ring*.24);
        y=.35+2.7*(1-((i*.17+t*1.4)%1));
        point.scale.set(.18,2.2,.18);alpha=.22+.48*pulse;
      }else if(kind==='tide'){
        radius=.6+2*t+ring*.08;x=home+Math.cos(a)*radius;
        z=Math.sin(a)*radius;y=.12+Math.sin(a*4+t*8)*.15;
        alpha=.72*(1-t);
      }else if(kind==='eclipse'){
        radius=1.14+Math.sin(elapsed*.004)*.12;
        x=home+Math.cos(a)*radius;
        y=2.5+Math.sin(a)*radius;
        z=.0;alpha=.24+.55*pulse;
      }else if(kind==='dawn'){
        radius=.35+1.8*t;x=home+Math.cos(a)*radius;
        y=2.5+Math.sin(a)*radius+1.1*t;z=Math.sin(a*2)*.25;
        alpha=.65*(1-t*.6);
      }else if(kind==='dust'){
        radius=.18+2.2*t*(.5+i%7/9);
        x=target+Math.cos(a)*radius;
        z=Math.sin(a)*radius;
        y=.08+.42*t+ring*.035;alpha=.74*(1-t);
      }else{
        radius=.5+(i%6)*.16;
        x=home+Math.cos(a+elapsed*.001)*radius;
        z=Math.sin(a+elapsed*.001)*radius;
        y=.35+((t+i*.11)%1)*2.6;alpha=.4+.35*pulse;
      }
      point.position.set(x,y,z);
      if(kind!=='storm')point.scale.setScalar(kind==='dust'?(.6+t*1.2):
        kind==='triumph' ? .38+.36*pulse : .4+.42*pulse);
      material.color.setHex(colors[kind]||colors.triumph);
      material.opacity=Math.max(0,Math.min(.85,alpha));
    }
  }
  function clearCanvas(){
    document.querySelectorAll('.combat-fighter[data-animal-id]').forEach(node=>{
      node.removeAttribute('data-3d-visible');
    });
    layer?.remove();stage=null;
  }
  function clearActors(){
    for(const actor of actors)actor?.destroy();
    actors=[null,null];
  }
  function fitStage(){
    if(!renderer||!camera||!stage)return;
    const box=stage.getBoundingClientRect();
    if(box.width<1||box.height<1)return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    renderer.setSize(Math.round(box.width),Math.round(box.height),false);
    const viewHeight=5.15,ratio=box.width/box.height;
    camera.left=-viewHeight*ratio/2;camera.right=viewHeight*ratio/2;
    camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    camera.updateProjectionMatrix();
    layout.scale.setScalar(Math.min(1,Math.max(.27,(viewHeight*ratio-.25)/6.6)));
  }
  function stopLoop(){if(running)cancelAnimationFrame(running);running=0;lastFrame=0;}
  function startLoop(){
    if(running||!renderer||screen()!=='BATTLE_PLAY'||document.hidden)return;
    running=requestAnimationFrame(frame);
  }
  function nativeLength(event){
    const actor=actors[event?.attacker];
    const seconds=actor?.asset?.clips?.[event?.move]?.duration;
    return Number.isFinite(seconds)&&seconds>0?seconds*1000:undefined;
  }
  function beginEvent(event){
    sequence={event,elapsed:0,contact:false,finished:false,attackStarted:false};
  }
  function advanceEvent(delta){
    if(!sequence)return;
    sequence.elapsed+=delta*1000;
    const {event}=sequence,attacker=actors[event.attacker],defender=actors[event.defender];
    const length=nativeLength(event);
    const timing=cinematics?.duration(event,length);
    const lead=timing?.miracleLead||0;
    if(!sequence.attackStarted&&sequence.elapsed>=lead){
      sequence.attackStarted=true;
      attacker?.move(event.move);
    }
    const actionTime=sequence.elapsed-lead;
    const contact=core.contactMs(event.attackerId,event.move,length);
    if(sequence.attackStarted&&!sequence.contact&&actionTime>=contact){
      sequence.contact=true;
      defender?.native(event.knockout?'knockout':'hit');
    }
    const settle=core.settleMs(event.attackerId,event.move,length);
    if(sequence.attackStarted&&!sequence.finished&&actionTime>=settle){
      sequence.finished=true;
      if(event.finished){
        attacker?.native('victory');
      }else{
        attacker?.idle();defender?.idle();
      }
    }
  }
  // Blocking is separate from each native/model animation: a repeatable
  // signature strike brings the attacker to the contact point, then lets the
  // victim react on its own rig, whatever animal is defending.
  function applyBlocking(){
    if(!sequence?.attackStarted||reduced())return;
    const {event}=sequence,attacker=actors[event.attacker],defender=actors[event.defender];
    const length=nativeLength(event);
    const lead=cinematics?.duration(event,length)?.miracleLead||0;
    const t=Math.max(0,sequence.elapsed-lead);
    const impact=core.contactMs(event.attackerId,event.move,length);
    const progress=Math.min(1,t/Math.max(1,impact));
    const release=Math.max(0,Math.min(1,1-(t-impact)/600));
    const travel=(event.move==='G'||event.move==='S') ? 0.72 : (event.move==='P' ? 0.37 : 0.25);
    const enter=progress*progress*(3-2*progress);
    const offset=travel*enter*release;
    if(attacker){
      const direction=event.attacker===0?1:-1;
      if(event.attackerId==='bear')attacker.pivot.position.x=attacker.baseX+direction*offset;
      else attacker.pivot.position.x+=direction*offset*.28;
    }
    if(defender&&sequence.contact){
      const reaction=Math.max(0,(t-impact)/220);
      const recoil=Math.min(1,reaction)*Math.exp(-reaction*.65)*.27;
      const direction=event.defender===0?-1:1;
      defender.pivot.position.x=defender.baseX+direction*recoil;
    }
  }
  function applyCamera(dt){
    if(!camera||!THREE)return;
    const live=window.NoahsCinematics?.getState();
    const event=live?.event||sequence?.event;
    const time=live?.elapsed??sequence?.elapsed??0;
    const wants=(!reduced()&&event&&cinematics)?
      cinematics.camera(event,time,nativeLength(event)):null;
    const x=wants?.x??0,y=wants?.y??3,z=wants?.z??12;
    const focusX=wants?.targetX??0,focusY=wants?.targetY??1.18;
    const wanted=new THREE.Vector3(x,y,z);
    const alpha=wants?.cut?.30:.16;
    camera.position.lerp(wanted,alpha);
    cameraLook.lerp(new THREE.Vector3(focusX,focusY,0),alpha);
    camera.lookAt(cameraLook);
    const zoom=wants?.zoom??1;
    const nextZoom=camera.zoom+(zoom-camera.zoom)*alpha;
    if(Math.abs(camera.zoom-nextZoom)>.00005){
      camera.zoom=nextZoom;camera.updateProjectionMatrix();
    }
  }
  function frame(time){
    running=0;
    if(screen()!=='BATTLE_PLAY'||document.hidden||!renderer||!scene)return;
    const dt=lastFrame?Math.min(.05,Math.max(0,(time-lastFrame)/1000)):0;
    lastFrame=time;
    for(const actor of actors)actor?.tick(dt);
    advanceEvent(dt);
    applyBlocking();
    applyCamera(dt);
    paintEffects();
    renderer.render(scene,camera);
    startLoop();
  }
  function syncScene(force=false){
    if(screen()!=='BATTLE_PLAY'){
      stopLoop();clearCanvas();closePanel();sequence=null;shownEvent=null;
      return;
    }
    const battlefield=ui.querySelector('.combat-battlefield'),s=state();
    if(!battlefield||!s)return;
    if(renderer&&layer){
      if(battlefield!==stage){stage=battlefield;stage.append(layer);fitStage();}
      let changed=force;
      for(let i=0;i<2;i++){
        const id=s.animals[i]?.id;
        if(actors[i]?.id!==id||(!actors[i]&&loaded[id])){
          actors[i]?.destroy();actors[i]=loaded[id]?makeActor(id,i):null;changed=true;
        }
      }
      const nodes=battlefield.querySelectorAll('.combat-fighter[data-animal-id]');
      nodes.forEach((node,i)=>{
        if(actors[i])node.dataset['3dVisible']='true';
        else node.removeAttribute('data-3d-visible');
      });
      layer.hidden=!actors.some(Boolean);
      const hit=core.battleEvent(s);
      if(!hit){if(shownEvent||changed){
        sequence=null;shownEvent=null;actors.forEach(actor=>actor?.idle());
      }}else if(changed||shownEvent!==hit.key){
        shownEvent=hit.key;beginEvent(hit);
      }
      startLoop();
    }
  }
  async function importSelected(id){
    if(loading)return;
    const files=selected[id];
    if(!files?.length){status('Choose an extracted '+id+' folder or its FBX and PNG files first.');return;}
    let plan;
    try{plan=core.planFiles(id,files);}
    catch(error){status(error.message);return;}
    if(!plan.ready){status(id.toUpperCase()+' missing: '+plan.missing.join(', '));return;}
    loading=true;
    const button=panel?.querySelector('[data-ark3d-load="'+id+'"]');
    if(button)button.disabled=true;
    try{
      const result=await loader.load(id,files,status);
      const old=loaded[id];
      // Actors are clones of the previously loaded source; free them before
      // disposing original geometry/textures.
      clearActors();
      old?.dispose();
      loaded[id]=result;
      await createScene();
      status(label(id)+' loaded with '+result.bones+' bones and '+Object.keys(result.clips).length+
        ' native motions. Enter a duel to see 3D movement.');
      if(panel){
        const el=panel.querySelector('[data-ark3d-loaded="'+id+'"]');
        if(el)el.textContent='3D MODEL + MOTIONS READY';
      }
      shownEvent=null;syncScene(true);
    }catch(error){
      status('3D load failed: '+(error?.message||String(error))+
        '. Existing illustrated fighters remain available.');
    }finally{loading=false;if(button)button.disabled=false;}
  }
  function remove(id){
    if(!loaded[id])return;
    clearActors();loaded[id].dispose();loaded[id]=null;
    shownEvent=null;sequence=null;syncScene(true);
    const el=panel?.querySelector('[data-ark3d-loaded="'+id+'"]');
    if(el)el.textContent='3D model removed';
    status(label(id)+' 3D source cleared from this browser session.');
  }
  ui.addEventListener('click',event=>{
    if(event.target.closest('[data-ark3d-open]'))openPanel();
  });
  game.addEventListener('click',event=>{
    if(!panel)return;
    const target=event.target;
    if(target.closest('[data-ark3d-close]')){closePanel();return;}
    const load=target.closest('[data-ark3d-load]');
    if(load){importSelected(load.dataset.ark3dLoad);return;}
    const unload=target.closest('[data-ark3d-unload]');
    if(unload){remove(unload.dataset.ark3dUnload);return;}
    const turn=target.closest('[data-ark3d-turn]');
    if(turn){
      const id=turn.dataset.ark3dTurn;
      yaw[id]=(yaw[id]+Math.PI/2)%(Math.PI*2);
      actors.filter(a=>a?.id===id).forEach(a=>a.idle());
      status(label(id)+' turned 90° for local camera review.');
    }
  });
  game.addEventListener('change',event=>{
    const id=event.target.dataset.ark3dFiles||event.target.dataset.ark3dFolder;
    if(!id||!Object.hasOwn(selected,id))return;
    selected[id]=Array.from(event.target.files||[]);
    status(label(id)+': '+selected[id].length+' files selected. Choose LOAD '+id.toUpperCase()+'.');
  });
  window.addEventListener('keydown',event=>{
    if(!panel||event.key!=='Escape')return;
    event.preventDefault();event.stopImmediatePropagation();closePanel();
  },true);
  window.addEventListener('arkade:screenchange',()=>syncScene());
  window.addEventListener('resize',fitStage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLoop();else startLoop();});
  window.addEventListener('pagehide',()=>{
    stopLoop();clearActors();for(const id of ['bear','moose'])loaded[id]?.dispose();
    fxGeometry?.dispose();fxMaterials.forEach(m=>m.dispose());fxMaterials=[];
    fxParticles=[];fxGroup=null;
    renderer?.dispose();renderer=null;clearCanvas();
  },{once:true});
  window.NoahsArena3D=Object.freeze({
    openPanel,
    getClipDuration:(index,move)=>nativeLength({attacker:index,move}),
    getStatus:()=>({bear:Boolean(loaded.bear),moose:Boolean(loaded.moose),
      sceneReady:Boolean(renderer),active:actors.filter(Boolean).length,
      panelOpen:Boolean(panel),loading})
  });
})();
