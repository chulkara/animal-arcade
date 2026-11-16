/* Local-only, rigged 3D battle stage. No private FBX or texture bytes are
 * fetched from this public site or transmitted to a server. */
(function(){
  'use strict';
  const core=window.NoahsArena3DCore,loader=window.NoahsArena3DLoader;
  const cinematics=window.NoahsCinematicCore;
  const bearReviewCore=window.NoahsBearReviewCore;
  const game=document.getElementById('game'),ui=document.getElementById('ui');
  if(!core||!loader||!game||!ui)return;
  const selected={bear:null,moose:null},loaded={bear:null,moose:null};
  const yaw={bear:0,moose:0};
  let panel=null,stage=null,layer=null,THREE=null,renderer=null,scene=null,camera=null,filmCamera=null,layout=null;
  let actors=[null,null],running=0,lastFrame=0,shownEvent=null,sequence=null,loading=false;
  let cameraLook=null,lastCameraShot=null,focusLight=null,
    fxGroup=null,fxParticles=[],fxGeometry=null,fxMaterials=[],
    shockRing=null,shockGeometry=null,shockMaterial=null;
  let bearReview=null,reviewToolbar=null;
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
      '<div class="ark-fbx-review"><strong>BEAR · CINEMATIC REVIEW</strong>'+
      '<p>Replay Guts, Technique and Power, then four victory camera angles. This is a non-scoring test with a 3-second countdown so you can start a screen recording.</p>'+
      '<button type="button" data-bear-review-start>START BEAR G/T/P + VICTORY REVIEW</button>'+
      '<small>Requires Bear 3D loaded and Brown Bear selected in this battle; Moose 3D is optional for the victim reaction.</small></div>'+

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
    // Keep a stable stage anchor for authored clip playback. Some motion
    // files include local root translation that can otherwise accumulate
    // into a disappearing fighter during the long victory montage.
    const restX=model.position.x,restZ=model.position.z;
    pivot.position.x=slot===0?-2.02:2.02;
    orientation.rotation.y=(slot===0?Math.PI/2:-Math.PI/2)+yaw[id];
    const mixer=new THREE.AnimationMixer(model),joint=new Map();
    const rootAnchors=[];
    model.traverse(node=>{
      if(!node.isBone)return;
      joint.set(node.name,node);
      // Keep the local-root baseline but preserve pelvis, shoulders, paws
      // and vertical jump/root bobbing. Native root X/Z are often measured
      // in source-FBX meters and can move the entire animal out of camera.
      if(/^RigRoot$/i.test(node.name)||(!node.parent?.isBone&&/^root$/i.test(node.name)))
        rootAnchors.push({bone:node,x:node.position.x,z:node.position.z});
    });
    const hindFeet=['RigLBLeg3','RigRBLeg3','RigLBLegAnkle','RigRBLegAnkle']
      .map(name=>joint.get(name)).filter(Boolean);
    const footTemp=new THREE.Vector3();
    const soleHeight=()=>{
      if(!hindFeet.length)return null;
      model.updateMatrixWorld(true);
      let min=Infinity;
      for(const bone of hindFeet){
        bone.getWorldPosition(footTemp);
        min=Math.min(min,footTemp.y);
      }
      return Number.isFinite(min)?min:null;
    };
    const actor={id,slot,asset,model,pivot,orientation,mixer,joint,rootAnchors,additive:new Map(),
      current:null,currentKey:null,proc:null,procElapsed:0,baseX:pivot.position.x,
      soleRest:null,soleHeight};
    actor.native=(key)=>{
      if(key!=='victory')actor.resetHowlFace?.();
      resetApplied(actor);actor.proc=null;actor.procElapsed=0;
      const name=asset.clips[key]?key:'idle',clip=asset.clips[name];
      if(!clip)return;
      if(actor.currentKey===name&&actor.current?.isRunning())return;
      const next=mixer.clipAction(clip,model);
      const previous=actor.current;
      if(previous&&previous!==next)previous.fadeOut(.15);
      next.reset();next.enabled=true;next.setEffectiveWeight(1);
      const oneShot=!['idle','run','breathing','jump','victory','angry'].includes(name);
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
    // Distinct muscle accents sit on top of the native source FBX. These
    // are small, reversible offsets; the imported source still determines
    // the true move and limb anatomy. Opponents keep their own reactions.
    actor.actionAccent=(move,windup,strike)=>{
      if(id!=='bear'||!Number.isFinite(windup)||!Number.isFinite(strike))return;
      const set=(name,axis,radians)=>{
        const bone=joint.get(name);
        if(!bone||Math.abs(radians)<.0001)return;
        if(!actor.additive.has(bone))actor.additive.set(bone,bone.quaternion.clone());
        bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,radians));
      };
      const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0);
      if(move==='G'){
        // Charge: lower head/shoulders, then drive forward on contact.
        set('RigHead',X,.09*windup-.06*strike);
        set('RigNeck',X,.07*windup);
        set('RigSpine1',X,.06*windup-.05*strike);
      }else if(move==='T'){
        // Low swipe: draw the lead paw back, then sweep across.
        set('RigLFLeg1',X,.09*windup-.11*strike);
        set('RigHead',Y,-.055*windup+.04*strike);
        set('RigSpine1',X,.045*windup);
      }else if(move==='P'){
        // Power: chest and front paws load before a heavier downward blow.
        set('RigSpine1',X,-.09*windup+.085*strike);
        set('RigLFLeg1',X,.075*windup-.105*strike);
        set('RigRFLeg1',X,.035*windup-.055*strike);
        set('RigHead',X,-.065*windup+.055*strike);
      }else if(move==='S'){
        set('RigSpine1',X,-.10*windup+.10*strike);
        set('RigLFLeg1',X,.09*windup-.11*strike);
        set('RigRFLeg1',X,.07*windup-.075*strike);
      }
    };
    // Discover actual facial articulation rather than assuming the FBX
    // has a fixed jaw name. If it has either jaw bones or mouth-open morph
    // targets, the howl visibly opens the mouth. All changes are reversible.
    const jawBone=[...joint.entries()].find(([name])=>
      /(?:^|rig)(?:lower)?jaw|mandible/i.test(name))?.[1]||null;
    const openMorphs=[];
    model.traverse(node=>{
      if(!node.isMesh||!node.morphTargetDictionary||!node.morphTargetInfluences)return;
      for(const [name,index] of Object.entries(node.morphTargetDictionary)){
        if(!/(?:jaw|mouth).*(?:open|wide)|(?:open|wide).*(?:jaw|mouth)|roar/i.test(name))continue;
        openMorphs.push({mesh:node,index,base:node.morphTargetInfluences[index]||0});
      }
    });
    actor.howlCapabilities=Object.freeze({jaw:!!jawBone,morphs:openMorphs.length});
    actor.resetHowlFace=()=>{
      for(const entry of openMorphs)entry.mesh.morphTargetInfluences[entry.index]=entry.base;
    };
    // Add subtle original gesture accents to the native upright victory
    // loop. They are deliberately small so the source FBX still owns the
    // Bear's anatomy and foot planting. Missing optional joints are skipped.
    actor.victoryGesture=(elapsed)=>{
      if(id!=='bear'||!Number.isFinite(elapsed)||elapsed<0)return;
      const t=Math.max(0,elapsed);
      const pulse=(start,end)=>{
        const p=Math.max(0,Math.min(1,(t-start)/(end-start)));
        return Math.sin(Math.PI*p);
      };
      const set=(name,axis,angle)=>{
        const bone=joint.get(name);
        if(!bone||!Number.isFinite(angle)||Math.abs(angle)<.0001)return;
        if(!actor.additive.has(bone))actor.additive.set(bone,bone.quaternion.clone());
        bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
      };
      const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
      const front=pulse(0,950),reverse=pulse(950,1930),overhead=pulse(1930,2900);
      set('RigHead',X,.055*front-.035*overhead);
      set('RigHead',Y,.095*reverse-.065*overhead);
      set('RigNeck',X,.042*front);
      set('RigSpine1',Z,.032*reverse-.024*overhead);
      set('RigLFLeg1',X,-.075*reverse);
      set('RigRFLeg1',X,-.065*overhead);
      // On the fourth camera cut, Bear finally raises its head and howls.
      // Keep the neck/chest/forepaws involved so it reads as a real animal
      // expression instead of only moving the camera toward a static face.
      const howl=cinematics.bearHowl(t);
      if(howl.active){
        set('RigHead',X,howl.headPitch);
        set('RigNeck',X,howl.neckPitch);
        set('RigSpine1',X,howl.chestPitch);
        set('RigChest',X,howl.chestPitch*.6);
        set('RigLFLeg1',X,howl.forePaw);
        set('RigRFLeg1',X,howl.forePaw*.85);
        if(jawBone)set(jawBone.name,X,.36*howl.jawOpen);
        for(const morph of openMorphs)
          morph.mesh.morphTargetInfluences[morph.index]=
            morph.base+(1-morph.base)*howl.jawOpen;
      }else actor.resetHowlFace();
    };
    actor.tick=(delta)=>{
      resetApplied(actor);
      mixer.update(reduced()?0:delta);
      // Root travel is staged explicitly on pivot, not by imported FBX.
      // Preserve vertical lift and all bone articulation for the strike.
      model.position.x=restX;model.position.z=restZ;
      for(const entry of rootAnchors){
        entry.bone.position.x=entry.x;
        entry.bone.position.z=entry.z;
      }
      // A conservative hind-foot grounding correction for standing/
      // victory poses. It does not attempt IK on running or striking legs;
      // those need a rig-specific polish pass with the private FBX.
      if(id==='bear'&&['idle','victory'].includes(actor.currentKey)&&hindFeet.length){
        const sole=soleHeight();
        if(sole!==null){
          if(actor.soleRest===null)actor.soleRest=sole;
          else{
            const fit=Math.max(.25,layout.scale.y||1);
            const delta=(actor.soleRest-sole)/fit;
            pivot.position.y+=Math.max(-.025,Math.min(.025,delta*.25));
          }
        }
      }
      if(actor.proc){
        actor.procElapsed+=reduced()?0:delta*1000;
        const sample=window.NoahsMooseActionCore.sampleMove(actor.proc,
          actor.procElapsed,{reducedMotion:reduced()});
        actor.pose(sample.pose);
      }
    };
    actor.idle=()=>{
      actor.resetHowlFace?.();
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
    camera=new THREE.OrthographicCamera(-4,4,2.5,-2.5,.1,100);
    // The flat orthographic camera keeps the default reel arena legible.
    // As soon as a cinematic runs, a real perspective lens provides
    // foreground scale, strong animal volume and purposeful camera angles.
    filmCamera=new THREE.PerspectiveCamera(28,1,.1,100);
    camera.position.set(0,3,12);cameraLook=new THREE.Vector3(0,1.18,0);
    camera.lookAt(cameraLook);
    filmCamera.position.copy(camera.position);
    filmCamera.lookAt(cameraLook);
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
    // Warm procedural key light for charged attacks and the winner.
    focusLight=new THREE.PointLight(0xffbb72,0,10,1.7);
    focusLight.position.set(0,2.0,2);scene.add(focusLight);
    // Real ground geometry gives the animals a shared shadow plane
    // that changes perspective with each movie cut. Previously both
    // animals floated over a static CSS mountain painting.
    const groundGeometry=new THREE.PlaneGeometry(64,64,24,24);
    const groundColor=new Float32Array(groundGeometry.attributes.position.count*3);
    const vertex=groundGeometry.attributes.position;
    for(let i=0;i<vertex.count;i++){
      const x=vertex.getX(i),y=vertex.getY(i);
      const wave=Math.sin(x*1.3+y*.85)*.035+Math.sin(x*.53-y*1.2)*.027;
      const edge=Math.max(0,Math.min(1,Math.hypot(x,y)/25));
      groundColor[i*3]=.20+wave*.32+edge*.06;
      groundColor[i*3+1]=.31+wave*.55+edge*.05;
      groundColor[i*3+2]=.24+wave*.28+edge*.06;
    }
    groundGeometry.setAttribute('color',new THREE.BufferAttribute(groundColor,3));
    const ground=new THREE.Mesh(groundGeometry,new THREE.MeshStandardMaterial({
      vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide
    }));
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-.035;ground.receiveShadow=true;
    scene.add(ground);
    // A restrained scattering of procedural grass adds depth cues,
    // without downloading a game texture or replacing the painted sky.
    const grassGeometry=new THREE.ConeGeometry(.038,.17,3);
    const grassMaterial=new THREE.MeshStandardMaterial({
      color:0x6c8760,roughness:1,side:THREE.DoubleSide
    });
    const grass=new THREE.InstancedMesh(grassGeometry,grassMaterial,75);
    const grassMatrix=new THREE.Matrix4(),grassPosition=new THREE.Vector3();
    let seed=0x57494c44;
    const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<75;i++){
      let x=(rand()-.5)*13,z=(rand()-.5)*9;
      if(Math.abs(x)<2.8&&Math.abs(z)<1.1)z+=(z<0?-1:1)*1.3;
      grassPosition.set(x,.05+rand()*.08,z);
      grassMatrix.makeTranslation(grassPosition.x,grassPosition.y,grassPosition.z);
      grass.setMatrixAt(i,grassMatrix);
    }
    grass.instanceMatrix.needsUpdate=true;
    scene.add(grass);
    // The reference uses detailed terrain to establish distance. Original
    // low-poly trunks, crown silhouettes and small rocks break up our
    // previously empty floor without any external protected game scenery.
    const rocks=new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(.21,0),
      new THREE.MeshStandardMaterial({color:0x8a8870,roughness:1}),42);
    const matrix=new THREE.Matrix4(),scaleVector=new THREE.Vector3();
    const quaternion=new THREE.Quaternion();
    for(let i=0;i<42;i++){
      let x=(rand()-.5)*22,z=(rand()-.5)*16;
      if(Math.abs(x)<3&&Math.abs(z)<2.2)z+=(z<0?-3:3);
      const w=.3+rand()*.95;
      scaleVector.set(w,.32+rand()*.32,w*1.45);
      matrix.compose(new THREE.Vector3(x,-.005,z),quaternion,scaleVector);
      rocks.setMatrixAt(i,matrix);
    }
    rocks.instanceMatrix.needsUpdate=true;
    scene.add(rocks);
    const count=14;
    const trunks=new THREE.InstancedMesh(
      new THREE.CylinderGeometry(.10,.19,1.75,5),
      new THREE.MeshStandardMaterial({color:0x4e4d36,roughness:1}),count);
    const crowns=new THREE.InstancedMesh(
      new THREE.ConeGeometry(.92,2.65,7),
      new THREE.MeshStandardMaterial({color:0x345b40,roughness:1}),count);
    for(let i=0;i<count;i++){
      const x=(rand()-.5)*38,z=-10-rand()*14;
      const height=.7+rand()*.75;
      scaleVector.set(height,height,height);
      matrix.compose(new THREE.Vector3(x,.84*height,z),quaternion,scaleVector);
      trunks.setMatrixAt(i,matrix);
      matrix.compose(new THREE.Vector3(x,2.6*height,z),quaternion,scaleVector);
      crowns.setMatrixAt(i,matrix);
    }
    trunks.instanceMatrix.needsUpdate=true;
    crowns.instanceMatrix.needsUpdate=true;
    scene.add(trunks,crowns);
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
    shockGeometry=new THREE.RingGeometry(.55,.68,48);
    shockMaterial=new THREE.MeshBasicMaterial({color:0xf1cf9d,
      transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
    shockRing=new THREE.Mesh(shockGeometry,shockMaterial);
    shockRing.rotation.x=-Math.PI/2;
    shockRing.position.y=.025;
    shockRing.visible=false;
    fxGroup.add(shockRing);
  }
  function paintEffects(){
    if(!fxGroup||reduced()){
      if(fxGroup)fxGroup.visible=false;
      if(shockRing)shockRing.visible=false;
      return;
    }
    const live=window.NoahsCinematics?.getState();
    if(!live?.event){
      fxGroup.visible=false;
      if(shockRing)shockRing.visible=false;
      return;
    }
    const {event,elapsed}=live;
    const timing=cinematics?.duration(event,nativeLength(event));
    const actionTime=elapsed-(timing?.actionLead||0);
    const contact=timing?.contact||900;
    const focusPhase=elapsed>=(timing?.miracleLead||0)&&elapsed<(timing?.actionLead||0);
    const miracle=cinematics?.miracle(event.miracleName);
    const miraclePhase=miracle&&elapsed<(timing?.miracleLead||0);
    const hitPhase=actionTime>=contact&&actionTime<contact+650;
    const victor=event.finished&&elapsed>=(timing?.victoryStart||Infinity);
    const heroTime=victor?elapsed-timing.victoryStart:0;
    // Hold a clean winning portrait instead of floating white bubbles
    // cluttering Bear's face throughout the final roar.
    const cleanPortrait=victor&&heroTime>=cinematics.VICTORY_HOWL_START_MS;
    if(!miraclePhase&&!focusPhase&&!hitPhase&&!victor){
      fxGroup.visible=false;
      if(shockRing)shockRing.visible=false;
      return;
    }
    fxGroup.visible=true;
    const home=event.attacker===0?-2.02:2.02;
    const target=event.defender===0?-2.02:2.02;
    const kind=miraclePhase?miracle.type:focusPhase?'charge':
      hitPhase?'dust':'triumph';
    const t=miraclePhase?elapsed/Math.max(1,timing.miracleLead):
      focusPhase?(elapsed-timing.miracleLead)/Math.max(1,timing.focusLead):
      hitPhase?(actionTime-contact)/650:
      (elapsed-timing.victoryStart)/4000;
    const colors={starfall:0xffd28d,storm:0xb9d6ff,tide:0x78e8da,
      eclipse:0xd7a4ff,dawn:0xffce85,charge:0xffb968,
      dust:0xded0b0,triumph:0xf8e5a7};
    if(shockRing){
      shockRing.visible=hitPhase;
      if(hitPhase){
        const age=Math.max(0,actionTime-contact);
        const size=.65+age/245;
        shockRing.position.x=target;
        shockRing.position.z=0;
        shockRing.scale.setScalar(size);
        shockMaterial.opacity=.68*Math.exp(-age/190);
      }
    }
    for(let i=0;i<fxParticles.length;i++){
      const point=fxParticles[i],material=fxMaterials[i];
      const a=(i/24)*Math.PI*2,ring=i%4;
      const pulse=Math.sin((i*19.7+elapsed*.004))*0.5+0.5;
      let x=0,y=0,z=0,radius=.4,alpha=.5;
      if(kind==='charge'){
        // Guts throws low dust, Technique draws a jade paw-level spiral,
        // and Power carries embers upward. Same animator, different move.
        radius=.30+ring*.14+(1-t)*.22;
        x=home+Math.cos(a+elapsed*.0042)*radius;
        z=Math.sin(a+elapsed*.0042)*radius;
        const height=event.move==='G'?.65:event.move==='T'?1.12:2.75;
        y=.12+((t*1.35+i*.16)%1)*height;
        alpha=.15+.62*Math.sin(Math.PI*Math.min(1,t));
      }else if(kind==='starfall'){
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
      const chargeColor=event.move==='G'?0xc4a077:
        event.move==='T'?0x87efbd:event.move==='P'?0xffad71:0xffcd7d;
      material.color.setHex(kind==='charge'?chargeColor:(colors[kind]||colors.triumph));
      material.opacity=cleanPortrait?0:Math.max(0,Math.min(.85,alpha));
    }
  }
  function paintFocusLight(){
    if(!focusLight||!sequence||reduced()){
      if(focusLight)focusLight.intensity=0;
      return;
    }
    const {event}=sequence;
    const beat=cinematics.shot(event,sequence.elapsed,nativeLength(event));
    const target=beat.beat==='FOCUS'?
      ({G:1.85,T:2.20,P:3.45,S:3.90}[event.move]||2.5):
      beat.beat==='VICTORY'?2.0:beat.beat==='CONTACT'?1.6:0;
    const colors={G:0xe0c19b,T:0x9ff0d1,P:0xffaa70,S:0xffd680};
    focusLight.color.setHex(colors[event.move]||0xffbb72);
    focusLight.intensity+=(target-focusLight.intensity)*.14;
    const actor=actors[event.attacker];
    const fit=layout?.scale?.x||1;
    focusLight.position.set((actor?.pivot.position.x??0)*fit,2.05*fit,1.0);
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
    if(filmCamera){
      filmCamera.aspect=ratio;
      filmCamera.updateProjectionMatrix();
    }
    layout.scale.setScalar(Math.min(1,Math.max(.27,(viewHeight*ratio-.25)/6.6)));
  }
  function stopLoop(){if(running)cancelAnimationFrame(running);running=0;lastFrame=0;}
  function startLoop(){
    if(running||!renderer||screen()!=='BATTLE_PLAY'||document.hidden)return;
    running=requestAnimationFrame(frame);
  }
  function reviewChange(){
    window.dispatchEvent(new CustomEvent('arkade:bearreviewchange'));
  }
  function updateReviewToolbar(){
    if(!bearReview||!reviewToolbar)return;
    const line=reviewToolbar.querySelector('[data-bear-review-step]');
    const detail=reviewToolbar.querySelector('[data-bear-review-detail]');
    if(!line||!detail)return;
    if(bearReview.countdown>0){
      line.textContent='RECORDING COUNTDOWN · '+Math.ceil(bearReview.countdown/1000);
      detail.textContent='GUTS → TECHNIQUE → POWER → VICTORY';
    }else if(bearReview.done){
      line.textContent='BEAR REVIEW COMPLETE';
      detail.textContent='Replay or stop. The real match has not changed.';
    }else{
      line.textContent='BEAR · '+bearReviewCore.label(bearReview.index);
      const angles={lowHero:'01 / 04 · LOW FRONT-QUARTER',
        sideHero:'02 / 04 · REVERSE QUARTER',
        highHero:'03 / 04 · HIGH OVERHEAD',
        finale:'04 / 04 · WINNER CLOSE-UP'};
      detail.textContent=angles[bearReview.cameraShot]||
        'ATTACK '+(bearReview.index+1)+' OF 3 · MATCH UNCHANGED';
    }
  }
  function stopBearReview(sync=true){
    if(!bearReview)return false;
    bearReview=null;
    reviewToolbar?.remove();
    reviewToolbar=null;
    ui.querySelector('.ark-reference-layout')?.classList.remove('ark-bear-reviewing');
    sequence=null;
    shownEvent=null;
    actors.forEach(actor=>actor?.idle());
    reviewChange();
    if(sync&&screen()==='BATTLE_PLAY')syncScene(true);
    return true;
  }
  function startBearReview(){
    if(screen()!=='BATTLE_PLAY'){
      status('Open a battle with Brown Bear selected to start its cinematic review.');
      return false;
    }
    if(!loaded.bear||!renderer||!bearReviewCore){
      status('Load the Brown Bear Motion Lab V2 3D files before starting Bear review.');
      return false;
    }
    let events;
    try{events=bearReviewCore.events(state());}
    catch(error){status(error.message);return false;}
    stopBearReview(false);
    bearReview={active:true,events,index:-1,event:null,countdown:3000,done:false};
    shownEvent=null;sequence=null;
    actors.forEach(actor=>actor?.idle());
    closePanel();
    const root=ui.querySelector('.ark-reference-layout');
    root?.classList.add('ark-bear-reviewing');
    reviewToolbar=document.createElement('div');
    reviewToolbar.className='ark-bear-review-toolbar';
    reviewToolbar.setAttribute('role','group');
    reviewToolbar.setAttribute('aria-label','Bear cinematic review');
    reviewToolbar.innerHTML='<div class="ark-bear-review-info">'+
      '<strong data-bear-review-step></strong>'+
      '<span data-bear-review-detail></span></div>'+
      '<button type="button" data-bear-review-replay>REPLAY FROM GUTS</button>'+
      '<button type="button" data-bear-review-stop>STOP REVIEW</button>';
    root?.append(reviewToolbar);
    updateReviewToolbar();
    reviewChange();
    startLoop();
    return true;
  }
  function startBearReviewStep(index){
    if(!bearReview)return;
    bearReview.index=index;
    bearReview.cameraShot=null;
    bearReview.event=bearReview.events[index];
    bearReview.countdown=0;
    bearReview.done=false;
    actors.forEach(actor=>actor?.idle());
    shownEvent=bearReview.event.key;
    beginEvent(bearReview.event);
    updateReviewToolbar();
    reviewChange();
  }
  function advanceBearReview(delta){
    if(!bearReview||document.hidden)return;
    if(bearReview.countdown>0){
      bearReview.countdown=Math.max(0,bearReview.countdown+(-delta*1000));
      if(!bearReview.countdown)startBearReviewStep(0);
      else updateReviewToolbar();
      return;
    }
    if(bearReview.done||!bearReview.event||!sequence)return;
    const length=nativeLength(bearReview.event);
    const total=cinematics.duration(bearReview.event,length).total;
    if(bearReview.event.finished){
      const current=cinematics.shot(bearReview.event,sequence.elapsed,length);
      const shot=current.beat==='VICTORY'?current.shot:null;
      if(shot!==bearReview.cameraShot){
        bearReview.cameraShot=shot;
        updateReviewToolbar();
      }
    }
    if(sequence.elapsed>=total+(bearReview.index===2?0:500)){
      if(bearReview.index===2){
        bearReview.done=true;
        updateReviewToolbar();
      }else startBearReviewStep(bearReview.index+1);
    }
  }
  function nativeLength(event){
    const actor=actors[event?.attacker];
    const seconds=actor?.asset?.clips?.[event?.move]?.duration;
    return Number.isFinite(seconds)&&seconds>0?seconds*1000:undefined;
  }
  function beginEvent(event){
    sequence={event,elapsed:0,contact:false,finished:false,attackStarted:false,
      victoryRearAt:null,victoryPlayed:false};
    const attacker=actors[event.attacker];
    if(attacker?.asset?.clips?.angry)attacker.native('angry');
  }
  function advanceEvent(delta){
    if(!sequence)return;
    sequence.elapsed+=delta*1000;
    const {event}=sequence,attacker=actors[event.attacker],defender=actors[event.defender];
    const length=nativeLength(event);
    const timing=cinematics?.duration(event,length);
    const lead=timing?.actionLead||0;
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
        if(attacker?.asset?.clips?.rear){
          attacker.native('rear');
          sequence.victoryRearAt=sequence.elapsed;
        }else{
          attacker?.native('victory');
          sequence.victoryPlayed=true;
        }
      }else{
        attacker?.idle();defender?.idle();
      }
    }
    if(sequence.finished&&event.finished&&!sequence.victoryPlayed&&attacker){
      const seconds=attacker.asset?.clips?.rear?.duration||0;
      const transition=Math.max(420,Math.min(950,seconds*1000));
      if(sequence.elapsed>=sequence.victoryRearAt+transition){
        attacker.native('victory');
        sequence.victoryPlayed=true;
      }
    }
  }
  // Blocking is separate from each native/model animation: a repeatable
  // signature strike brings the attacker to the contact point, then lets the
  // victim react on its own rig, whatever animal is defending.
  function applyBlocking(){
    if(!sequence||reduced())return;
    const {event}=sequence,attacker=actors[event.attacker],defender=actors[event.defender];
    const timing=cinematics.duration(event,nativeLength(event));
    const actionElapsed=sequence.elapsed-timing.actionLead;
    // Before a signature hit, hold weight low and settle into the pose.
    if(actionElapsed<0){
      const progress=Math.max(0,Math.min(1,
        (sequence.elapsed-timing.miracleLead)/Math.max(1,timing.focusLead)));
      if(attacker?.id==='bear'){
        const direction=event.attacker===0?1:-1;
        attacker.pivot.position.y=-.065*progress;
        attacker.orientation.rotation.z=direction*-.048*progress;
      }
      return;
    }
    // Keep planted victory footing. Do not overwrite its root position
    // after the native rear/victory clip has started.
    if(sequence.finished&&event.finished&&sequence.elapsed>=timing.victoryStart){
      if(attacker){
        attacker.pivot.position.x=attacker.baseX;
        attacker.pivot.position.z=0;
      }
      return;
    }
    const choreo=cinematics.blocking(event,sequence.elapsed,nativeLength(event));
    const direction=event.attacker===0?1:-1;
    const opposite=event.defender===0?-1:1;
    // Use a bounded offset from the beginning of each frame, never '+='.
    // Accumulating frame-by-frame movement caused visible skating/teleports.
    if(attacker){
      const source=attacker.id==='moose'&&attacker.proc?
        attacker.pivot.position.x:attacker.baseX;
      attacker.pivot.position.x=source+direction*choreo.attackerTravel*
        (attacker.id==='moose'?.27:1);
      if(attacker.id==='bear'){
        attacker.pivot.position.y=choreo.attackerLift;
        attacker.orientation.rotation.z=direction*choreo.attackerLean;
      }
    }
    if(defender&&sequence.contact){
      defender.pivot.position.x=defender.baseX+opposite*choreo.defenderTravel;
      // Native hit and knockout clips remain the primary reaction.
      if(!event.knockout&&defender.id==='bear')
        defender.orientation.rotation.z=opposite*choreo.defenderLean;
    }
  }
  function applyCamera(dt){
    if(!camera||!THREE||!cameraLook)return;
    const live=window.NoahsCinematics?.getState();
    const event=live?.event||sequence?.event;
    const time=live?.elapsed??sequence?.elapsed??0;
    const wants=(!reduced()&&event&&cinematics)?
      cinematics.camera(event,time,nativeLength(event)):null;
    const fit=layout?.scale?.x??1;
    const focusX=(wants?.targetX??0)*fit;
    // Camera azimuth must survive portrait-stage scaling. Scaling the
    // camera's orbit offset by .27 made all four angles indistinguishable.
    const x=focusX+((wants?.x??0)-(wants?.targetX??0));
    const y=wants?.y??3,z=wants?.z??12;
    const focusY=(wants?.targetY??1.18)*fit;
    const wanted=new THREE.Vector3(x,y,z);
    const focus=new THREE.Vector3(focusX,focusY,0);
    const key=event?.key+':'+(wants?.shot||'wide');
    if(key!==lastCameraShot){
      // A real movie cut changes viewing direction in a single frame.
      // Interpolating between the front/reverse/overhead camera positions
      // made the 'four angles' read as the same continuous profile shot.
      camera.position.copy(wanted);
      cameraLook.copy(focus);
      if(camera.zoom!==(wants?.zoom??1)){
        camera.zoom=wants?.zoom??1;
        camera.updateProjectionMatrix();
      }
      lastCameraShot=key;
    }else{
      const alpha=1-Math.exp(-Math.max(dt,1/120)*7);
      camera.position.lerp(wanted,alpha);
      cameraLook.lerp(focus,alpha);
      const zoom=wants?.zoom??1;
      if(Math.abs(camera.zoom-zoom)>.00005){
        camera.zoom+=alpha*(zoom-camera.zoom);
        camera.updateProjectionMatrix();
      }
    }
    camera.lookAt(cameraLook);
    if(filmCamera){
      filmCamera.position.copy(camera.position);
      filmCamera.lookAt(cameraLook);
      const fit=Math.max(.27,layout?.scale?.x||1);
      const heroFactor=Math.min(1.75,1/fit);
      filmCamera.zoom=Math.min(2.2,(wants?.zoom??1)*heroFactor);
      filmCamera.updateProjectionMatrix();
    }
  }
  function frame(time){
    running=0;
    if(screen()!=='BATTLE_PLAY'||document.hidden||!renderer||!scene)return;
    const dt=lastFrame?Math.min(.05,Math.max(0,(time-lastFrame)/1000)):0;
    lastFrame=time;
    // Start attack/reaction clips before evaluating the bones for this
    // frame. At contact, freeze both rigs for 88ms while light/dust/audio
    // continue. This produces weight without delaying the battle rules.
    advanceEvent(dt);
    advanceBearReview(dt);
    const stopped=Boolean(sequence&&!reduced()&&cinematics.hitStop(
      sequence.event,sequence.elapsed,nativeLength(sequence.event)));
    for(const actor of actors)actor?.tick(stopped?0:dt);
    if(sequence?.attackStarted&&!sequence.finished){
      const {event}=sequence;
      const guide=cinematics.blocking(event,sequence.elapsed,nativeLength(event));
      actors[event.attacker]?.actionAccent(event.move,guide.windup,guide.strike);
    }
    const winner=sequence?.event?.finished?actors[sequence.event.attacker]:null;
    if(winner?.id==='bear'&&sequence.finished){
      const start=cinematics.duration(sequence.event,nativeLength(sequence.event)).victoryStart;
      winner.victoryGesture(sequence.elapsed-start);
    }
    applyBlocking();
    applyCamera(dt);
    paintEffects();
    paintFocusLight();
    const event=sequence?.event;
    renderer.render(scene,event&&!reduced()?filmCamera:camera);
    startLoop();
  }
  function syncScene(force=false){
    if(screen()!=='BATTLE_PLAY'){
      stopBearReview(false);
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
      const hit=bearReview?.active?bearReview.event:core.battleEvent(s);
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
      stopBearReview(false);
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
    stopBearReview(false);
    clearActors();loaded[id].dispose();loaded[id]=null;
    shownEvent=null;sequence=null;syncScene(true);
    const el=panel?.querySelector('[data-ark3d-loaded="'+id+'"]');
    if(el)el.textContent='3D model removed';
    status(label(id)+' 3D source cleared from this browser session.');
  }
  ui.addEventListener('click',event=>{
    if(event.target.closest('[data-bear-review-quick]')){
      if(!loaded.bear){
        openPanel();
        status('Load Brown Bear Motion Lab V2 files first, then select START BEAR G/T/P + VICTORY REVIEW above.');
        panel?.querySelector('[data-bear-review-start]')?.focus();
      }else if(!startBearReview()){
        openPanel();
      }
      return;
    }
    if(event.target.closest('[data-bear-review-replay]')){startBearReview();return;}
    if(event.target.closest('[data-bear-review-stop]')){stopBearReview();return;}
    if(event.target.closest('[data-ark3d-open]'))openPanel();
  });
  game.addEventListener('click',event=>{
    if(!panel)return;
    const target=event.target;
    if(target.closest('[data-ark3d-close]')){closePanel();return;}
    const load=target.closest('[data-ark3d-load]');
    if(load){importSelected(load.dataset.ark3dLoad);return;}
    if(target.closest('[data-bear-review-start]')){startBearReview();return;}
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
    if(event.key!=='Escape'||!panel)return;
    event.preventDefault();event.stopImmediatePropagation();closePanel();
  },true);
  window.addEventListener('arkade:screenchange',()=>syncScene());
  window.addEventListener('resize',fitStage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLoop();else startLoop();});
  window.addEventListener('pagehide',()=>{
    stopBearReview(false);
    stopLoop();clearActors();for(const id of ['bear','moose'])loaded[id]?.dispose();
    fxGeometry?.dispose();fxMaterials.forEach(m=>m.dispose());fxMaterials=[];
    shockGeometry?.dispose();shockMaterial?.dispose();
    shockRing=null;shockGeometry=null;shockMaterial=null;
    fxParticles=[];fxGroup=null;
    renderer?.dispose();renderer=null;clearCanvas();
  },{once:true});
  window.NoahsArena3D=Object.freeze({
    openPanel,
    startBearReview,
    stopBearReview,
    getReviewState:()=>bearReview?{
      active:bearReview.active,event:bearReview.event,elapsed:sequence?.elapsed||0,
      done:bearReview.done,index:bearReview.index,countdown:bearReview.countdown
    }:null,
    getClipDuration:(index,move)=>nativeLength({attacker:index,move}),
    getStatus:()=>({bear:Boolean(loaded.bear),moose:Boolean(loaded.moose),
      sceneReady:Boolean(renderer),active:actors.filter(Boolean).length,
      // The private FBX may not have a jaw bone or mouth morph. Expose
      // only the detected capability, not the private model data itself.
      bearHowlFace:actors.find(actor=>actor?.id==='bear')?.howlCapabilities||null,
      panelOpen:Boolean(panel),loading})
  });
})();
