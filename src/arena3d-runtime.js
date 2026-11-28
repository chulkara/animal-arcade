/* Local-only, rigged 3D battle stage. No private FBX or texture bytes are
 * fetched from this public site or transmitted to a server. */
(function(){
  'use strict';
  const core=window.NoahsArena3DCore,loader=window.NoahsArena3DLoader;
  const cinematics=window.NoahsCinematicCore;
  const bearReviewCore=window.NoahsBearReviewCore;
  const game=document.getElementById('game'),ui=document.getElementById('ui');
  if(!core||!loader||!game||!ui)return;
  const selected={bear:null,moose:null,shark:null},loaded={bear:null,moose:null,shark:null};
  const yaw={bear:0,moose:0,shark:0};
  let panel=null,stage=null,layer=null,THREE=null,renderer=null,scene=null,camera=null,filmCamera=null,layout=null;
  let actors=[null,null],running=0,lastFrame=0,shownEvent=null,sequence=null,loading=false;
  let cameraLook=null,lastCameraShot=null,focusLight=null,
    fxGroup=null,fxParticles=[],fxGeometry=null,fxMaterials=[],
    shockRing=null,shockGeometry=null,shockMaterial=null;
  let bearReview=null,reviewToolbar=null,forestfallOverlayOpen=false;
  let message='Choose an extracted private Motion Lab folder. The files stay on this device.';
  const screen=()=>window.__arkade?.getScreen();
  const state=()=>window.NoahsCombat?.getState();
  const reduced=()=>Boolean(window.__arkade?.getSettings()?.reducedMotion)||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const label=id=>window.NoahsRoster?.ANIMALS?.[id]?.name||(id==='bear'?'BROWN BEAR':id==='moose'?'MOUNTAIN MOOSE':'GREAT WHITE SHARK');
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
      '<div class="ark-fbx-import" data-ark3d-species="shark"><strong>'+label('shark')+'</strong><small data-ark3d-loaded="shark">'+
        (loaded.shark?'READY · BUNDLED':'Bundled with the game · loads automatically')+'</small>'+
        '<small>"Great White Shark" by Mateus Schwaab, CC BY 4.0.</small></div>'+
      '<p class="ark-fbx-status" data-ark3d-status role="status"></p>'+
      '<p class="ark-fbx-legal">Choose the extracted Bear and Moose folders. Models load locally in this browser session.</p>';
    game.append(panel);
    status(message);
    panel.querySelector('[data-ark3d-close]')?.focus();
  }
  function closePanel(){panel?.remove();panel=null;}
  function resetApplied(actor){
    for(const [bone,quaternion] of actor.additive)bone.quaternion.copy(quaternion);
    actor.additive.clear();
  }
  // ---- Rare card finishes (Doodle / Porcelain / Chrome) on the 3D coat ----
  // Each finish swaps a fighter's coat for its own materials (cached per
  // slot + source material, so a mirror match never shares a coat and a
  // rematch reuses compiled shaders). The source materials stay untouched.
  const finishCache=new Map(),finishTex=new Map();
  let chromeEnv=null,glazeEnv=null,toonRamp=null;
  function envTexture(kind){
    const c=document.createElement('canvas');c.width=512;c.height=256;
    const g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,256);
    if(kind==='chrome'){
      // a dark studio sky, one thin bright horizon band and a near-black
      // floor: high-contrast reflections are what read as polished metal
      grad.addColorStop(0,'#1d2a38');grad.addColorStop(.3,'#4d6a86');grad.addColorStop(.45,'#bfd3e4');
      grad.addColorStop(.49,'#ffffff');grad.addColorStop(.52,'#5a4a3c');grad.addColorStop(.7,'#2b221b');grad.addColorStop(1,'#120e0b');
    }else{
      grad.addColorStop(0,'#e9eef6');grad.addColorStop(.5,'#ffffff');grad.addColorStop(.56,'#c9c4bb');grad.addColorStop(1,'#8d8780');
    }
    g.fillStyle=grad;g.fillRect(0,0,512,256);
    if(kind==='chrome'){
      // a few soft window streaks so highlights travel across the body
      g.globalAlpha=.55;g.fillStyle='#ffffff';
      for(const x of [40,170,300,420])g.fillRect(x,58,18,52);
      g.globalAlpha=1;
    }
    const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;
    t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function rampTexture(){
    const data=new Uint8Array([70,70,70,255,165,165,165,255,255,255,255,255]);
    const t=new THREE.DataTexture(data,3,1,THREE.RGBAFormat);
    t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;
  }
  // Repaint a coat texture for a finish (canvas, ≤1024 px, keeps alpha).
  function finishMap(src,finish){
    if(!src?.image)return null;
    const key=src.uuid+'|'+finish;if(finishTex.has(key))return finishTex.get(key);
    let out=null;
    try{
      const img=src.image,w0=img.width||img.videoWidth||0,h0=img.height||img.videoHeight||0;
      if(!w0||!h0)throw Error('texture not ready');
      const k=Math.min(1,1024/Math.max(w0,h0)),w=Math.max(1,Math.round(w0*k)),h=Math.max(1,Math.round(h0*k));
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,w,h);
      const px=g.getImageData(0,0,w,h),d=px.data;
      // normalise to this coat's own range (a grey shark and a brown bear
      // both get their full light-to-dark spread of glaze/steel/crayon)
      const hist=new Uint32Array(256);let n=0;
      for(let i=0;i<d.length;i+=4)if(d[i+3]>8){hist[(d[i]*.299+d[i+1]*.587+d[i+2]*.114)|0]++;n++;}
      const pct=q=>{let acc=0;for(let v=0;v<256;v++){acc+=hist[v];if(acc>=q*n)return v/255;}return 1;};
      const lo=pct(.08),hi=Math.max(lo+.05,pct(.92));
      for(let i=0;i<d.length;i+=4){
        const lum=Math.max(0,Math.min(1,((d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255-lo)/(hi-lo)));
        if(finish==='chrome'){
          // grey steel that keeps the fur's light/dark grain
          const v=Math.round(255*(.3+lum*.68));d[i]=v;d[i+1]=Math.min(255,v+3);d[i+2]=Math.min(255,v+8);
        }else if(finish==='porcelain'){
          // blue-and-white glaze: dark fur becomes cobalt brushwork
          const ink=Math.max(0,Math.min(1,(.62-lum)*1.7));
          d[i]=Math.round(246-ink*214);d[i+1]=Math.round(246-ink*186);d[i+2]=Math.round(250-ink*92);
        }else{
          // doodle: crayon on warm paper, three flat tones of the coat's own hue
          const p=(i>>2),x=p%w,y=(p/w)|0,q=lum<.28?.38:lum<.55?.68:.95;
          const r=d[i]/255,gg=d[i+1]/255,b=d[i+2]/255,m=Math.max(r,gg,b,.001);
          const hatch=((x+y)%7===0)&&lum<.55?.84:1;
          d[i]=Math.round(255*Math.min(1,(r/m*.68+.32)*q*hatch*1.02));
          d[i+1]=Math.round(255*Math.min(1,(gg/m*.68+.32)*q*hatch*.98));
          d[i+2]=Math.round(255*Math.min(1,(b/m*.68+.32)*q*hatch*.9));
        }
      }
      g.putImageData(px,0,0);
      out=new THREE.CanvasTexture(c);
      for(const p of ['flipY','wrapS','wrapT','colorSpace','channel'])if(p in src)out[p]=src[p];
      out.repeat.copy(src.repeat);out.offset.copy(src.offset);out.anisotropy=4;out.needsUpdate=true;
    }catch(err){console.warn('[arena3d] finish texture skipped',err);out=null;}
    finishTex.set(key,out);return out;
  }
  function finishMaterial(src,finish,slot){
    const key=slot+'|'+finish+'|'+src.uuid;if(finishCache.has(key))return finishCache.get(key);
    const base={name:src.name+'·'+finish,map:finishMap(src.map,finish),normalMap:src.normalMap||null,
      transparent:!!src.transparent,alphaTest:src.alphaTest||0,side:src.side,
      emissive:src.emissive?src.emissive.clone():new THREE.Color(0)};
    if(src.emissiveMap){base.emissiveMap=finishMap(src.emissiveMap,finish);base.emissiveIntensity=src.emissiveIntensity*.6;}
    let m;
    if(finish==='chrome'){
      chromeEnv||=envTexture('chrome');
      m=new THREE.MeshPhongMaterial({...base,color:0xb9c2cc,specular:0xffffff,shininess:140,
        envMap:chromeEnv,combine:THREE.MixOperation,reflectivity:.66});
    }else if(finish==='porcelain'){
      glazeEnv||=envTexture('glaze');
      m=new THREE.MeshPhongMaterial({...base,color:0xffffff,specular:0x9aa3b0,shininess:70,
        envMap:glazeEnv,combine:THREE.MixOperation,reflectivity:.12});
    }else{
      toonRamp||=rampTexture();
      m=new THREE.MeshToonMaterial({...base,color:0xffffff,gradientMap:toonRamp});
    }
    if(src.normalScale&&m.normalScale)m.normalScale.copy(src.normalScale);
    if(!base.map)m.color.copy(src.color||new THREE.Color(1,1,1));
    finishCache.set(key,m);return m;
  }
  // Doodle ink line: an inverted hull that shares the skin's geometry and
  // skeleton, pushed out along the skinned normal (object space).
  function inkOutline(mesh){
    const s=mesh.getWorldScale(new THREE.Vector3()).x||1;
    const mat=new THREE.MeshBasicMaterial({color:0x241a12,side:THREE.BackSide});
    const width={value:.024/s};
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uInk=width;
      shader.vertexShader='uniform float uInk;\n'+shader.vertexShader.replace('#include <skinning_vertex>',
        '#include <skinning_vertex>\n#ifdef USE_SKINNING\ntransformed+=normalize(objectNormal)*uInk;\n#else\ntransformed+=normalize(normal)*uInk;\n#endif');
    };
    mat.customProgramCacheKey=()=>'ark-ink';
    const hull=mesh.isSkinnedMesh?new THREE.SkinnedMesh(mesh.geometry,mat):new THREE.Mesh(mesh.geometry,mat);
    if(mesh.isSkinnedMesh){hull.bindMode=mesh.bindMode;hull.bind(mesh.skeleton,mesh.bindMatrix);}
    hull.name='ArkInk';hull.castShadow=false;hull.receiveShadow=false;hull.frustumCulled=false;
    hull.position.copy(mesh.position);hull.quaternion.copy(mesh.quaternion);hull.scale.copy(mesh.scale);
    return hull;
  }
  function applyFinish(actor,finish){
    finish=['doodle','porcelain','chrome'].includes(finish)?finish:'standard';
    if(actor.finish===finish)return;
    actor.finish=finish;
    for(const ink of actor.inks||[]){ink.parent?.remove(ink);ink.material.dispose();}
    actor.inks=[];
    actor.model.updateMatrixWorld(true);
    const meshes=[];
    actor.model.traverse(o=>{if(o.isMesh&&o.name!=='MouthBag'&&o.name!=='ArkInk')meshes.push(o);});
    for(const o of meshes){
      o.userData.arkBaseMaterial??=o.material;
      const src=o.userData.arkBaseMaterial;
      o.material=finish==='standard'?src:Array.isArray(src)?src.map(m=>finishMaterial(m,finish,actor.slot)):finishMaterial(src,finish,actor.slot);
      if(finish==='doodle'&&o.isSkinnedMesh&&o.parent){const ink=inkOutline(o);o.parent.add(ink);actor.inks.push(ink);}
    }
    actor.tintMats=null;
  }
  function finishFor(slot,id){
    const s=state();
    if(slot===1&&s?.session?.mode==='SOLO')return 'standard';
    try{return window.NoahsCards?.getFinish?.(slot,id)||'standard';}catch{return 'standard';}
  }
  function makeActor(id,slot){
    const asset=loaded[id];
    if(!asset||!THREE||!layout)return null;
    const model=asset.clone(asset.model);
    const geometry=new THREE.Group(),pivot=new THREE.Group(),orientation=new THREE.Group();
    // Shark: an extra "swim" group between orientation and the model holds
    // its hover height and its pitch/roll about the BODY CENTRE (orientation
    // turns about the floor under it, which would swing a hovering body wide).
    const swim=id==='shark'?new THREE.Group():null;
    geometry.add(model);
    if(swim){swim.add(geometry);orientation.add(swim);}else orientation.add(geometry);
    pivot.add(orientation);layout.add(pivot);
    if(asset.bundled){
      // A cloned glTF skin measures from stale bone matrices (and caches the
      // result): the shark came out ~100x too big and was scaled to a speck.
      model.updateMatrixWorld(true);
      model.traverse(o=>{if(o.isSkinnedMesh)o.boundingBox=null;});
    }
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<.0001)throw Error('Cannot fit '+id+' skeleton to the 3D stage');
    const reach=asset.fitLength||3.1;
    const scale=Math.min(2.75/size.y,reach/Math.max(size.x,.001),reach/Math.max(size.z,.001));
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    const fitted=new THREE.Box3().setFromObject(model);
    const center=fitted.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-fitted.min.y,-center.z);
    // body centre height above its own belly line (the swim group's pivot)
    const bodyMid=(fitted.max.y-fitted.min.y)/2;
    if(swim)geometry.position.y=-bodyMid;
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
    // Rig* names the shared layers (roar, flinch, hit react) address, mapped
    // to this model's own bones. Absent limbs are simply skipped.
    for(const [alias,name] of Object.entries(asset.aliases||{})){
      const bone=joint.get(name);if(bone&&!joint.has(alias))joint.set(alias,bone);
    }
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
      soleRest:null,soleHeight,swim,bodyMid};
    if(swim){
      // Extents/contact from the deforming bones only: Rigify's control and
      // mechanism bones can sit off the body.
      actor.extentBones=[...new Set(joint.values())].filter(b=>/^DEF-/.test(b.name));
      // launches tumble about the body centre: hover + half the body height
      actor.spinCentre=window.NoahsSharkActionCore.HOVER+bodyMid;
      actor.strikeBone=move=>move==='T'?joint.get('DEF-spine001_0143')||null:null;
      actor.sharkClock=0;
      // lying on its flank: centre at about half the torso's thickness
      actor.lieHeight=.4*(asset.fitLength||3.1)/3.7;
    }
    // Find when each native strike actually lands: sample the clip offline
    // and take the frame where the striking bones reach furthest forward
    // (in the actor's own facing frame, root travel anchored like at runtime).
    // Bone transforms are restored afterwards, so nothing visible changes.
    if(id==='bear'&&cinematics?.setMeasuredContact){
      const paws=['RigLFLegDigit11','RigRFLegDigit11','RigLFLegAnkle','RigRFLegAnkle'];
      const strikers={G:['RigHead'],T:paws,P:paws,S:[...paws,'RigHead']};
      const saved=[...joint.values()].map(b=>[b,b.position.clone(),b.quaternion.clone(),b.scale.clone()]);
      const probe=new THREE.AnimationMixer(model),v=new THREE.Vector3();
      for(const move of Object.keys(strikers)){
        const clip=asset.clips[move];const bones=strikers[move].map(n=>joint.get(n)).filter(Boolean);
        if(!clip||!bones.length||!(clip.duration>.2))continue;
        const action=probe.clipAction(clip);action.reset().play();
        let best=-Infinity,bestT=null;
        for(let t=0;t<=clip.duration;t+=1/60){
          probe.setTime(t);
          for(const a of rootAnchors){a.bone.position.x=a.x;a.bone.position.z=a.z;}
          orientation.updateMatrixWorld(true);
          for(const bone of bones){
            orientation.worldToLocal(bone.getWorldPosition(v));
            const reach=v.z;
            if(reach>best){best=reach;bestT=t;}
          }
        }
        action.stop();probe.uncacheAction(clip);
        const frac=bestT/clip.duration;
        if(!(frac>.12&&frac<.97))console.info('[arena3d] bear',move,'reach peak at',Math.round(bestT*1000),'ms rejected; keeping estimate');
        if(bestT!=null&&frac>.12&&frac<.97){
          cinematics.setMeasuredContact('bear',move,bestT*1000);
          console.info('[arena3d] bear',move,'contact measured at',Math.round(bestT*1000),'ms of',Math.round(clip.duration*1000));
        }
      }
      for(const [b,p,q,sc] of saved){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(sc);}
      model.updateMatrixWorld(true);
    }
    // Many death clips open with a slow stagger before the body drops, which
    // read as the loser ignoring the knockout blow. Measure when the pelvis
    // starts to fall and begin the clip shortly before that.
    actor.knockoutLead=0;
    if(asset.clips.knockout&&joint.get('RigPelvis')){
      const pelvis=joint.get('RigPelvis'),clip=asset.clips.knockout;
      const saved=[...joint.values()].map(b=>[b,b.position.clone(),b.quaternion.clone(),b.scale.clone()]);
      const probe=new THREE.AnimationMixer(model),v=new THREE.Vector3(),action=probe.clipAction(clip);
      action.reset().play();probe.setTime(0);orientation.updateMatrixWorld(true);
      const stand=orientation.worldToLocal(pelvis.getWorldPosition(v)).y;
      let drop=null;
      for(let t=0;t<=clip.duration;t+=1/60){
        probe.setTime(t);orientation.updateMatrixWorld(true);
        if(orientation.worldToLocal(pelvis.getWorldPosition(v)).y<stand*.93){drop=t;break;}
      }
      action.stop();probe.uncacheAction(clip);
      for(const [b,p,q,sc] of saved){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(sc);}
      model.updateMatrixWorld(true);
      if(drop!=null)actor.knockoutLead=Math.max(0,Math.min(clip.duration*.6,drop-.18));
      console.info('[arena3d]',id,'knockout drop at',drop==null?'none':Math.round(drop*1000),'ms; lead',Math.round(actor.knockoutLead*1000));
    }
    // Power aura for solo attacks, in the arcade's style: the animal's fur
    // takes a deep ember tint (multiplied, so fur detail stays) and soft
    // flame sprites lick upward off its body, born at random bones. No
    // outline shells: they read as a cheap neon sticker.
    actor.aura=[];actor.tintMats=null;
    // Upper body only: embers born at the legs read as flames between them.
    const flameBones=[...joint.values()].filter(b=>/Spine|Chest|Neck|Head|Pelvis|Hips/i.test(b.name)&&
      !/Jaw|Tongue|Eye|Lid|Ear|Tail|Digit|Leg/i.test(b.name));
    actor.auraUniform={value:0};
    actor.setAura=(level,time=0,gold=0)=>{
      if(!actor.tintMats){
        // Add the roar's mouth light now (switched off): adding a light later
        // recompiles every lit material mid-film, which dropped the rim-lit
        // body from the frame at the roar (and caused a hitch).
        if(!actor.mouthLight&&pivot.parent){
          actor.mouthLight=new THREE.PointLight(0xff9f8a,0,.55,2);
          actor.mouthLight.castShadow=false;pivot.parent.add(actor.mouthLight);
        }
        actor.tintMats=[];
        model.traverse(o=>{
          if(!o.isMesh||o.name==='MouthBag'||o.name==='ArkInk')return;
          for(const m of [].concat(o.material))
            if(m?.color&&!actor.tintMats.includes(m)){
              if(!m.userData.baseColor)m.userData.baseColor=m.color.clone();
              actor.tintMats.push(m);
              // Warm Fresnel rim: the aura hugs the silhouette (reference's
              // orange combat aura) instead of cards standing off the body.
              // Materials are cached and outlive actors: inject ONCE per
              // material (a second injection redefines uAura and the shader
              // fails to compile, dropping the body from the frame).
              if(!m.userData.arkAuraUniform&&!window.__arkNoRim){
                const uniform=m.userData.arkAuraUniform={value:0};
                // rim colour: fire orange, or gold for a ✦ Gold Change
                const hue=m.userData.arkAuraColor={value:new THREE.Color(1.0,0.40,0.04)};
                const prior=m.onBeforeCompile;
                m.onBeforeCompile=(shader,r)=>{
                  prior?.call(m,shader,r);
                  if(shader.fragmentShader.includes('uniform float uAura;'))return;
                  shader.uniforms.uAura=uniform;shader.uniforms.uAuraColor=hue;
                  shader.fragmentShader='uniform float uAura;\nuniform vec3 uAuraColor;\n'+shader.fragmentShader.replace('#include <dithering_fragment>',
                    `float arkRim=pow(1.0-clamp(abs(dot(normalize(normal),normalize(vViewPosition))),0.0,1.0),3.2);
                    gl_FragColor.rgb+=uAuraColor*arkRim*uAura*0.85;
                    #include <dithering_fragment>`);
                };
                m.customProgramCacheKey=()=>'ark-aura';
                m.needsUpdate=true;
              }
            }
        });
      }
      for(const m of actor.tintMats)if(m.userData.arkAuraUniform)m.userData.arkAuraUniform.value=Math.max(0,level);
      const g=Math.max(0,Math.min(1,gold));
      for(const m of actor.tintMats){
        m.color.copy(m.userData.baseColor);
        if(level>0.001)m.color.multiply(new THREE.Color(1,1-.08*level,1-.18*level));
        // Gold Change: the coat turns burnished gold (lifted, then tinted)
        // keep the fur's own light/dark (texture × colour), just pushed to gold
        if(g>0.001)m.color.lerp(new THREE.Color(1.0,.74,.32),g*.62);
        m.userData.arkAuraColor?.value.setRGB(1.0,.40+.42*g,.04+.30*g);
        // burnished-metal read: gold specular highlights + a faint gold glow
        // (Phong from FBX; PBR metalness would go black with no env map)
        if(m.specular){
          if(!m.userData.baseSpec){m.userData.baseSpec=m.specular.clone();m.userData.baseShine=m.shininess;}
          m.specular.copy(m.userData.baseSpec).lerp(new THREE.Color(.75,.6,.3),g);
          m.shininess=m.userData.baseShine+(48-m.userData.baseShine)*g;
        }else if('metalness' in m){
          if(m.userData.baseMetal===undefined){m.userData.baseMetal=m.metalness;m.userData.baseRough=m.roughness;}
          m.metalness=m.userData.baseMetal+(.5-m.userData.baseMetal)*g;m.roughness=m.userData.baseRough+(.3-m.userData.baseRough)*g;
        }
        if(m.emissive){if(!m.userData.baseEmissive)m.userData.baseEmissive=m.emissive.clone();
          m.emissive.copy(m.userData.baseEmissive).lerp(new THREE.Color(.09,.055,.0),g);}
      }
      // Ember sprites are off: on the real rigs they read as pale "teardrops"
      // floating over the backs. The Fresnel rim alone carries the aura.
      if(window.__arkEmbers&&!actor.aura.length&&level>0&&flameBones.length&&scene){
        const tex=flameSpriteTexture();
        model.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
        actor.flameScale=Math.max(.2,size.y*.18);
        for(let i=0;i<22;i++){
          const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,color:0xffa040,
            blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:0}));
          sp.userData={bone:flameBones[(i*7)%flameBones.length],phase:(i*.6180339)%1,
            jx:(((i*37)%17)/17-.5),jz:(((i*53)%13)/13-.5),speed:.7+((i*29)%11)/22};
          sp.renderOrder=5;scene.add(sp);actor.aura.push(sp);
        }
      }
      const v=new THREE.Vector3(),fs=actor.flameScale||.3;
      for(const sp of actor.aura){
        const d=sp.userData;
        if(level<=0.001||!actor.pivot.visible){sp.visible=false;continue;}
        const life=((time*.0010*d.speed)+d.phase)%1;
        d.bone.getWorldPosition(v);
        // embers drift up off the back and fade; small, never a wall of cards
        sp.position.set(v.x+d.jx*fs*1.4,v.y+fs*(.6+life*3.2),v.z+d.jz*fs*1.4);
        const sc=fs*(.45+.35*Math.sin(life*Math.PI))*(1-.5*life);
        sp.scale.set(sc*.6,sc,1);
        sp.material.opacity=level*.55*Math.sin(life*Math.PI);
        sp.material.rotation=d.jx*.6;
        sp.visible=true;
      }
    };
    actor.native=(key,fadeSeconds=.15)=>{
      if(key!=='victory'&&key!=='roar')actor.resetHowlFace?.();
      resetApplied(actor);actor.proc=null;actor.procElapsed=0;actor.sproc=null;
      const name=asset.clips[key]?key:'idle',clip=asset.clips[name];
      if(!clip)return;
      if(actor.currentKey===name&&actor.current?.isRunning())return;
      const next=mixer.clipAction(clip,model);
      const previous=actor.current;
      if(previous&&previous!==next)previous.fadeOut(fadeSeconds);
      next.reset();next.enabled=true;next.setEffectiveWeight(1);next.timeScale=1;
      actor.staged=null;actor.stagedAction=null;
      if(name==='knockout'&&actor.knockoutLead)next.time=actor.knockoutLead;
      const oneShot=!['idle','run','walk','breathing','jump','victory','angry','swimFast'].includes(name);
      next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);
      next.clampWhenFinished=name==='knockout'||name==='roar';
      next.fadeIn(fadeSeconds).play();
      actor.current=next;actor.currentKey=name;
    };
    actor.move=(move)=>{
      if(!['G','T','P','S'].includes(move))return;
      if(id==='bear'){
        actor.native(move);
        // Restage timing only for moves the director lists (wind-up / snap /
        // linger / recover). Same table drives the cinematic timeline.
        const clip=asset.clips[move];
        actor.staged=clip&&cinematics?.staging?cinematics.staging('bear',move,
          cinematics.measuredContact('bear',move),clip.duration*1000):null;
        actor.stagedAction=actor.staged?actor.current:null;actor.stagedMove=move;
        return;
      }
      const code={G:'Guts',T:'Technique',P:'Power',S:'Special'}[move];
      if(swim){
        // Scrub the move's own clip (jaws snap on the authored beat) under
        // our body staging; tick() drives both from procElapsed.
        const clipKey=window.NoahsSharkActionCore.MOVES[code].clip;
        actor.native(clipKey,.1);
        if(actor.current){actor.current.setLoop(THREE.LoopRepeat,Infinity);actor.current.timeScale=0;}
        actor.sproc=code;actor.procElapsed=0;
        return;
      }
      const base=window.NoahsMooseActionCore.MOVES[code].base.toLowerCase();
      actor.native(base);actor.proc=code;actor.procElapsed=0;
      // Same wind-up / snap / linger / recover timing as the director uses.
      actor.procStaging=cinematics?.staging?cinematics.staging('moose',move,
        cinematics.MOOSE_CONTACT[move],window.NoahsMooseActionCore.MOVES[code].frames.at(-1).ms):null;
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
      set('RigLFLeg2',X,(pose.leftFrontKnee||0)*.8);
      set('RigRFLeg2',X,(pose.rightFrontKnee||0)*.8);
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
    const jawBone=(asset.aliases?.RigJaw&&joint.get('RigJaw'))||[...joint.entries()].find(([name])=>
      /(?:^|rig)(?:lower)?jaw|mandible/i.test(name))?.[1]||null;
    // The source Bear has no modelled mouth interior: opening the jaw only
    // stretches lip skin around an empty hole, which reads as a black box.
    // Build a back-faced "mouth bag" from the muzzle's own triangles, inset a
    // hair along the normals and skinned to the same skeleton. It is only
    // visible through the opening, where it shows as gums/palate.
    if(id==='bear'&&jawBone)buildMouthBag(model,jawBone);
    const jawRest=jawBone?jawBone.quaternion.clone():null;
    const openMorphs=[];
    model.traverse(node=>{
      if(!node.isMesh||!node.morphTargetDictionary||!node.morphTargetInfluences)return;
      for(const [name,index] of Object.entries(node.morphTargetDictionary)){
        if(!/(?:jaw|mouth).*(?:open|wide)|(?:open|wide).*(?:jaw|mouth)|roar/i.test(name))continue;
        openMorphs.push({mesh:node,index,base:node.morphTargetInfluences[index]||0});
      }
    });
    // Report whether the optional vocal motion actually touches head/jaw
    // articulation. "A roar FBX exists" alone doesn't prove a moving mouth.
    const vocalTracks=asset.clips.roar?.tracks||[];
    const jawTracks=vocalTracks.filter(track=>
      /(?:lower)?jaw|mandible|mouth/i.test(track.name)).length;
    const headTracks=vocalTracks.filter(track=>
      /(?:rig)?head|(?:rig)?neck/i.test(track.name)).length;
    actor.howlCapabilities=Object.freeze({
      head:joint.has('RigHead'),neck:joint.has('RigNeck'),
      jaw:!!jawBone,morphs:openMorphs.length,
      nativeRoar:Boolean(asset.clips.roar),
      roarHeadTracks:headTracks,roarJawTracks:jawTracks
    });
    actor.resetHowlFace=()=>{
      for(const entry of openMorphs)entry.mesh.morphTargetInfluences[entry.index]=entry.base;
    };
    // Add subtle original gesture accents to the native upright victory
    // loop. They are deliberately small so the source FBX still owns the
    // Bear's anatomy and foot planting. Missing optional joints are skipped.
    actor.victoryGesture=(elapsed,nativeRoar=false)=>{
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
      const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),
        Z=new THREE.Vector3(0,0,1);
      // FBX local X is not a reliable "raise the muzzle" hinge. A bear
      // stands facing across the stage (+X in left slot, -X in right slot).
      // Convert that world-space pitch/yaw into each bone's local frame,
      // so the movement stays anatomically legible on mirrored fighters.
      const yawWorld=new THREE.Vector3(0,1,0);
      // The four-paw approach turns the winner a little toward the lens.
      // Fold that turn into the pitch axis so head lift never reads as roll.
      const approachTurn=-(slot===0?1:-1)*cinematics.victoryApproach(t).turn;
      const baseYaw=(slot===0?Math.PI/2:-Math.PI/2)+yaw[id];
      // Respect the optional TURN 90° control too: the correct head-up
      // axis follows the animal's current facing, not merely its slot.
      const facingWorld=new THREE.Vector3(0,0,1)
        .applyAxisAngle(yawWorld,baseYaw+approachTurn);
      const pitchWorld=facingWorld.clone().cross(yawWorld).normalize();
      // Orientation sits inside the turned pivot, so its lean axis ignores the turn.
      const pivotPitch=new THREE.Vector3(0,0,1).applyAxisAngle(yawWorld,baseYaw)
        .cross(yawWorld).normalize();
      const localWorldAxis=(bone,axis)=>{
        bone.updateWorldMatrix(true,false);
        const q=new THREE.Quaternion();
        bone.getWorldQuaternion(q);
        return axis.clone().applyQuaternion(q.invert()).normalize();
      };
      const setWorld=(name,worldAxis,angle)=>{
        const bone=joint.get(name);
        if(!bone||!Number.isFinite(angle)||Math.abs(angle)<.0001)return;
        if(!actor.additive.has(bone))actor.additive.set(bone,bone.quaternion.clone());
        bone.quaternion.multiply(
          new THREE.Quaternion().setFromAxisAngle(localWorldAxis(bone,worldAxis),angle));
        bone.updateWorldMatrix(false,true);
      };
      // Shot one gives the Bear a proud rise, the reverse shot turns its
      // face toward camera, and the high shot gathers breath.
      const front=pulse(0,900),reverse=pulse(900,1820),
        overhead=pulse(1820,2700);
      void front;void reverse;void overhead;
      const howl=cinematics.bearHowl(t);
      if(!howl.active||window.__arkNoHowl){
        actor.resetHowlFace();
        return;
      }
      // Native roar FBX is authoritative if selected locally. If none is
      // available, a more pronounced authored multi-bone choreography is
      // the fallback. We never fake facial joint support.
      const strength=nativeRoar ? 0.32 : 1;
      // Curve defines negative pitch for a raised head. PitchWorld is a
      // real left/right-mirrored sideways stage axis, not a guessed RigHead
      // bone axis. This is the critical fix for a previously static-looking
      // "howl" where bone rotations often read as twist instead of lift.
      setWorld('RigHead',pitchWorld,-howl.headPitch*strength);
      setWorld('RigHead',yawWorld,howl.headYaw*strength);
      setWorld('RigNeck',pitchWorld,-howl.neckPitch*strength);
      setWorld('RigSpine1',pitchWorld,-howl.chestPitch*strength);
      setWorld('RigChest',pitchWorld,-howl.chestPitch*.65*strength);
      setWorld('RigLFLeg1',pitchWorld,-howl.forePaw*.55*strength);
      setWorld('RigRFLeg1',pitchWorld,-howl.forePaw*.47*strength);
      // Keep the standing hind paws grounded. Lean in the animal's facing
      // plane, not around orientation.rotation.x (that rolled the torso).
      orientation.rotation.set(0,baseYaw,0);
      orientation.quaternion.premultiply(new THREE.Quaternion()
        .setFromAxisAngle(pivotPitch,-howl.bodyLean*.38*strength));
      pivot.position.y=howl.bodyDrop*.50*strength;
      if(jawBone&&!nativeRoar)
        setWorld(jawBone.name,pitchWorld,-.52*howl.jawOpen); // ~30°: open, not unhinged
      actor.howlJaw=howl.jawOpen;
      // The textured gums, tongue and palate exist but sit in the head's own
      // shadow, so an open mouth read as a black slot. A small warm fill
      // light in front of the jaw (radius < 1 unit, no shadows) lights the
      // inside of the mouth only while it is open.
      if(jawBone){
        if(!actor.mouthLight&&pivot.parent){
          actor.mouthLight=new THREE.PointLight(0xff9f8a,0,.55,2);
          actor.mouthLight.castShadow=false;pivot.parent.add(actor.mouthLight);
        }
        if(actor.mouthLight){
          const at=jawBone.getWorldPosition(new THREE.Vector3())
            .addScaledVector(facingWorld,.06).addScaledVector(yawWorld,.04);
          actor.mouthLight.position.copy(at);
          actor.mouthLight.intensity=reduced()?0:2.2*howl.jawOpen;
        }
      }
      for(const morph of openMorphs)
        morph.mesh.morphTargetInfluences[morph.index]=
          morph.base+(1-morph.base)*howl.jawOpen;
    };
    const strikePitch=new THREE.Vector3(),strikeFacing=new THREE.Vector3(),strikeQ=new THREE.Quaternion();
    const addRot=(name,worldAxis,angle)=>{
      const bone=joint.get(name);
      if(!bone||!Number.isFinite(angle)||Math.abs(angle)<.0001)return;
      if(!actor.additive.has(bone))actor.additive.set(bone,bone.quaternion.clone());
      bone.updateWorldMatrix(true,false);
      const local=worldAxis.clone().applyQuaternion(bone.getWorldQuaternion(strikeQ).invert()).normalize();
      bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(local,angle));
      bone.updateWorldMatrix(false,true);
    };
    const addPitch=(name,angle)=>addRot(name,strikePitch,angle);
    const UP=new THREE.Vector3(0,1,0);
    const neckBones=['RigNeck','RigNeck1','RigNeck2','RigNeck3'].filter(n=>joint.has(n));
    const addNeck=(axis,angle)=>{for(const n of neckBones)addRot(n,axis,angle/Math.max(1,neckBones.length));};
    const updateFacing=()=>{
      orientation.updateMatrixWorld(true);
      strikeFacing.set(0,0,1).applyQuaternion(orientation.getWorldQuaternion(strikeQ));
      strikeFacing.y=0;strikeFacing.normalize();
      strikePitch.copy(strikeFacing).cross(UP).normalize();
    };
    // Moose win (it has no roar or rear-up clip of its own): it bugles with
    // its head thrown up as it walks in (same beat as the Bear's howl), then
    // plants and rears up on its hind legs with its own Power rear-up,
    // bellowing again at the top. Absolute in victory time; no drift.
    actor.mooseVictory=(t)=>{
      if(id!=='moose')return;
      const R0=2300,ms=t-R0;
      if(ms>=0&&!actor.vicPlanted){actor.vicPlanted=true;actor.native('idle',.3);}
      if(ms<0)actor.vicPlanted=false;
      actor.victoryLift=0;actor.victoryRear=0;
      if(reduced())return;
      let rearPeak=0;
      if(ms>=0){
        // Legs from its own Power stomp (crouch → forehooves up → down),
        // held at the top while it bellows. The body pitch itself is applied
        // in applyBlocking about the hind feet (victoryRear); the pose's own
        // pitch/roll turn about the wrong axis on a 90°-yawed rig.
        const m=ms<850?ms:ms<1500?850:Math.min(1440,850+(ms-1500)*.75);
        const pose={...window.NoahsMooseActionCore.sampleMove('Power',m).pose,travel:0,lateral:0,pitch:0,roll:0,yaw:0,lift:0};
        const keepX=pivot.position.x,keepZ=pivot.position.z;
        actor.pose(pose);pivot.position.x=keepX;pivot.position.z=keepZ;
        const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
        rearPeak=ease((ms-380)/420)*(1-ease((ms-1500)/420));
        actor.victoryRear=.7*rearPeak;
      }
      const howl=ms<0?cinematics.bearHowl(t):null;
      const up=Math.max(howl?.active?-howl.headPitch*1.5:0,.5*rearPeak);
      const jaw=Math.max(howl?.active?howl.jawOpen:0,rearPeak);
      if(up>.001||jaw>.001){
        updateFacing();
        addNeck(strikePitch,.45*up);addPitch('RigHead',.55*up);addPitch('RigJaw',-.32*jaw);
      }
    };
    // Defender hit reactions layered on the single stock hit clip, shaped by
    // the blow: a head-on charge throws the head back, a swipe snaps it
    // sideways, an overhead strike drives head and chest down and buckles the
    // forelegs. A fast impulse (peak ~70 ms) then a short settle.
    actor.react=null;
    actor.hitReact=(move,strength)=>{actor.react={age:0,move,strength};};
    const reactAccent=delta=>{
      const r=actor.react;
      if(!r||reduced()){orientation.position.y=0;return;}
      r.age+=delta*1000;
      if(r.age>900){actor.react=null;orientation.position.y=0;return;}
      const a=r.age/70,k=a*Math.exp(1-a)*r.strength;           // impulse 0→1→0
      const settle=Math.sin(Math.min(1,r.age/520)*Math.PI)*Math.exp(-r.age/420)*r.strength*.35;
      updateFacing();
      if(r.move==='T'){
        addRot('RigHead',UP,.42*k-.12*settle);addNeck(UP,.26*k);
        addRot('RigHead',strikeFacing,.18*k);
        addPitch('RigChest',.06*k);
      }else if(r.move==='P'||r.move==='S'){
        addPitch('RigHead',-.34*k+.1*settle);addNeck(strikePitch,-.28*k);
        addPitch('RigChest',-.12*k);addPitch('RigSpine1',-.06*k);
        addPitch('RigLFLeg1',.16*k);addPitch('RigRFLeg1',.16*k);
        orientation.position.y=-.11*k;
        return;
      }else{
        addPitch('RigHead',.38*k-.1*settle);addNeck(strikePitch,.26*k);
        addPitch('RigChest',.12*k);addPitch('RigSpine1',.07*k);
      }
      orientation.position.y=-.04*k;
    };
    // Exaggeration layered on the restaged source clip: gather weight back
    // in the wind-up, drive the chest and head down through the blow, then a
    // chest heave as it lands. Positive = lean back / nose up.
    const strikeAccent=()=>{
      const st=actor.staged,action=actor.stagedAction;
      if(!st||action!==actor.current||reduced())return;
      const tc=action.time*1000,c=st.contact;
      const kp=cinematics.keyPose(id,actor.stagedMove,tc,st);
      // Small chest heave as the blow lands, on top of the key poses.
      const heave=tc>c?Math.sin(Math.min(1,(tc-c)/420)*Math.PI)*Math.exp(-(tc-c)/600):0;
      updateFacing();
      addPitch('RigSpine1',kp.spine1);addPitch('RigSpine2',kp.spine2);
      addPitch('RigChest',kp.chest+.07*heave);
      addRot('RigChest',UP,kp.chestYaw);
      addNeck(strikePitch,kp.neck+.06*heave);
      addPitch('RigHead',kp.head+.03*heave);addRot('RigHead',UP,kp.headYaw);
      addPitch('RigLFLeg1',kp.shoulderL);addPitch('RigRFLeg1',kp.shoulderR);
      // arm thrown out to the side (about the body's forward axis) and elbows
      // +θ about forward pulls a right-side paw IN (see the guard below), so
      // throwing an arm OUT is −θ for the right, +θ for the left.
      if(kp.armOutL)addRot('RigLFLeg1',strikeFacing,kp.armOutL);
      if(kp.armOutR)addRot('RigRFLeg1',strikeFacing,-kp.armOutR);
      if(kp.elbowL)addPitch('RigLFLeg2',kp.elbowL);
      if(kp.elbowR)addPitch('RigRFLeg2',kp.elbowR);
      // T-pose guard: a source swipe can fling a foreleg straight out
      // sideways like a plank. Pull any paw that swings past the body's
      // side back in, rotating that shoulder about the forward axis
      // (+θ about forward lowers a paw on the right side, so sign = side).
      model.updateMatrixWorld(true);
      const centre=joint.get('RigChest')||joint.get('RigSpine2');
      if(centre){
        const c=centre.getWorldPosition(new THREE.Vector3()),pw=new THREE.Vector3();
        for(const [paw,shoulder] of [['RigLFLegDigit11','RigLFLeg1'],['RigRFLegDigit11','RigRFLeg1']]){
          const b=joint.get(paw)||joint.get(paw.replace('Digit11','Ankle'));
          if(!b||!joint.get(shoulder))continue;
          b.getWorldPosition(pw);
          const side=pw.sub(c).dot(strikePitch),limit=.42*(actor.scale||1);
          if(Math.abs(side)>limit)addRot(shoulder,strikeFacing,Math.sign(side)*Math.min(.85,(Math.abs(side)-limit)*1.6));
        }
      }
    };
    // Shark body layer: hover + bob, move staging (lift/pitch/roll/yaw),
    // an S-bend through the body and tail, head yaw, extra jaw, the
    // procedural knockout roll and the victory gape. Absolute each frame.
    const sharkLayer=(delta)=>{
      const S=window.NoahsSharkActionCore,still=reduced();
      actor.sharkClock+=still?0:delta*1000;
      const pose=actor.sproc&&actor.sharkSample?actor.sharkSample.pose:null;
      let koP=0;
      if(actor.currentKey==='knockout'&&actor.current){
        const d=actor.current.getClip().duration||1;koP=actor.current.time/d;
      }
      const ko=S.knockout(still?(koP>.5?1:0):koP);
      const vic=actor.sharkVic||null;actor.sharkVic=null;
      // + = toward the lens, mirrored for either slot
      const lens=slot===0?-1:1;
      const lift=(pose?.lift||0)+(vic?.lift||0);
      // down: on its flank ON the dirt (centre at half its body thickness);
      // belly-up at bodyMid left the dorsal fin propping it above the ground
      const swimY=bodyMid+S.hover(actor.sharkClock,{reducedMotion:still})+lift;
      swim.position.y=swimY*(1-ko.sink)+actor.lieHeight*ko.sink;
      swim.rotation.set(-((pose?.pitch||0)+(vic?.pitch||0)),0,(pose?.roll||0)+ko.roll*lens);
      if(pose){
        orientation.rotation.y=(slot===0?Math.PI/2:-Math.PI/2)+yaw[id]+lens*pose.yaw;
        pivot.position.x=actor.baseX+(slot===0?1:-1)*pose.travel;
      }
      swim.updateMatrixWorld(true);
      const q=swim.getWorldQuaternion(new THREE.Quaternion());
      const dorsal=new THREE.Vector3(0,1,0).applyQuaternion(q),left=new THREE.Vector3(1,0,0).applyQuaternion(q);
      // idle swim: a slow travelling S-wave through the body on top of the
      // Swim clip (it barely moves the tail), fading out while it attacks,
      // is knocked down or reduced motion is on; a faint tail twitch when down
      const calm=pose||still?0:1-ko.sink,ph=actor.sharkClock/1000*Math.PI*2*.55;
      const twitch=still?0:ko.sink*.05*Math.sin(actor.sharkClock/70)*Math.max(0,Math.sin(actor.sharkClock/900));
      const bend=(pose?.bend||0)+ko.bend+twitch,tail=(pose?.tail||0)+(vic?.tail||0)+(actor.sharkRoarTail||0);
      actor.sharkRoarTail=0;
      const chain=asset.body||[];
      chain.forEach((pair,i)=>{
        const wave=calm*.07*(.5+i/chain.length)*Math.sin(ph-i*.9);
        const angle=lens*(bend/Math.max(1,chain.length)+(i>=chain.length-2?tail*.5:0))+wave;
        for(const name of pair)addRot(name,dorsal,angle);
      });
      const headYaw=(pose?.headYaw||0)+(vic?.headYaw||0);
      if(Math.abs(headYaw)>.0001)addRot('RigNeck',dorsal,lens*headYaw);
      if(vic?.headUp)addRot('RigNeck',left,-.5*vic.headUp);
      const jaw=(pose?.jaw||0)+(vic?.jaw||0);
      if(jaw>.0001)addRot('RigJaw',left,.55*jaw);
      // victory: pectoral fins swept back along the body (spread down and
      // out head-on, they read as a stiff airplane)
      if(vic?.fins){addRot('DEF-side_finL_0122',dorsal,.55*vic.fins);addRot('DEF-side_finR_0133',dorsal,-.55*vic.fins);}
    };
    actor.sharkVictory=(t)=>{
      if(!swim)return;
      if(reduced()){actor.sharkVic=null;return;}
      const howl=cinematics.bearHowl(t),s=t/1000;
      // circles its spot with a lazy bob and tail swish; on the howl beat it
      // throws its head up and gapes, thrashing side to side
      // the jaws SNAP (gape, clamp, gape) through the roar beat instead of
      // hanging open; tail sweeps and head thrash keep it swimming
      const snap=howl.active?howl.jawOpen*(.25+.75*Math.pow(Math.abs(Math.sin(s*Math.PI*1.6)),.6)):0;
      actor.sharkVic={lift:.12*Math.sin(s*Math.PI*2*.45),tail:.45*Math.sin(s*Math.PI*2*.9),
        pitch:howl.active?-howl.headPitch*.35:0,headUp:howl.active?-howl.headPitch:0,
        jaw:snap,headYaw:.12*Math.sin(s*Math.PI*2*.9+1.2)+(howl.active?.18*Math.sin(s*15)*howl.jawOpen:0),
        fins:Math.min(1,s/.4)};
    };
    actor.tick=(delta)=>{
      resetApplied(actor);
      if(actor.staged&&actor.stagedAction===actor.current)
        actor.current.timeScale=actor.staged.speedAt(actor.current.time*1000);
      if(swim&&actor.sproc&&actor.current){
        // scrub the move's clip to the authored beat (frozen in hit-stop)
        actor.procElapsed+=reduced()?0:delta*1000;
        actor.sharkSample=window.NoahsSharkActionCore.sampleMove(actor.sproc,actor.procElapsed,{reducedMotion:reduced()});
        const d=actor.current.getClip().duration,ct=actor.sharkSample.pose.clipTime;
        actor.current.time=actor.currentKey==='swimFast'?((ct%d)+d)%d:Math.max(0,Math.min(d-.001,ct));
      }
      mixer.update(reduced()?0:delta);
      // Root travel is staged explicitly on pivot, not by imported FBX.
      // Preserve vertical lift and all bone articulation for the strike.
      model.position.x=restX;model.position.z=restZ;
      for(const entry of rootAnchors){
        entry.bone.position.x=entry.x;
        entry.bone.position.z=entry.z;
      }
      strikeAccent();
      reactAccent(reduced()?0:delta);
      // Title-card roar: head up, jaw open (warm light inside the mouth).
      const lvl=reduced()?0:(actor.roarLevel||0);
      if(lvl>0.001){
        updateFacing();
        addPitch('RigNeck1',.16*lvl);addPitch('RigHead',.26*lvl);addPitch('RigChest',.07*lvl);
        addPitch('RigJaw',-.2*lvl);
        if(swim){
          // The shark thrashes its head and lashes its tail, jaws agape.
          actor.roarClock=(actor.roarClock||0)+delta;const w=actor.roarClock;
          addRot('RigNeck',UP,.3*lvl*Math.sin(w*8));addPitch('RigJaw',-.3*lvl);
          actor.sharkRoarTail=.55*lvl*Math.sin(w*6.5);
        }
        if(id==='moose'){
          // The Moose is not a statue under its title: it tosses its antlers
          // side to side and rakes the ground with a forehoof.
          actor.roarClock=(actor.roarClock||0)+delta;const w=actor.roarClock;
          addRot('RigHead',UP,.3*lvl*Math.sin(w*7.2));addNeck(UP,.2*lvl*Math.sin(w*7.2-.5));
          addPitch('RigHead',-.12*lvl*Math.max(0,Math.sin(w*14.4)));
          const rake=Math.max(0,Math.sin(w*8.5));
          addPitch('RigRFLeg1',.32*rake*lvl);addPitch('RigRFLeg2',-.55*rake*lvl);
        }
      }else actor.roarClock=0;
      // contact flinch (set by applyBlocking): head thrown back, forelegs up
      const fl=actor.flinchLevel||0;
      if(fl>.001&&!reduced()){
        updateFacing();addPitch('RigHead',.38*fl);addNeck(strikePitch,.24*fl);
        addPitch('RigLFLeg1',.42*fl);addPitch('RigRFLeg1',.34*fl);
      }
      // The title roar's mouth light must sit in the mouth: it was never
      // positioned, so it lit a pale disc on the ground at the world origin
      // in every title shot. Leave it to the victory howl while that runs.
      if(actor.mouthLight&&!(actor.howlJaw>0.01)){
        actor.mouthLight.intensity=2.0*lvl;
        if(lvl>0.001&&jawBone)actor.mouthLight.position.copy(jawBone.getWorldPosition(new THREE.Vector3())
          .addScaledVector(strikeFacing,.06).addScaledVector(UP,.04));
        else if(lvl<=0.001)actor.mouthLight.intensity=0;
      }
      // The inner-mouth bag only exists for an open jaw; closed, it can poke
      // out under the chin when the head is lifted (seen in the strike lunge).
      if(actor.mouthBag===undefined)actor.mouthBag=model.getObjectByName('MouthBag')||null;
      // A source clip may open the jaw far wider than the lip mesh can stretch
      // (striped lip panel in the strike lunge): cap it at ~29°, and show the
      // mouth interior whenever the jaw is actually open, whatever opened it.
      let jawAngle=0;
      if(jawBone&&jawRest){
        jawAngle=2*Math.acos(Math.min(1,Math.abs(jawBone.quaternion.dot(jawRest))));
        // the roar (our own jaw rig + mouth interior) may open ~29°; a source
        // clip only ~12°, past which its lips stretch into a striped panel
        // (the shark's mouth is modelled for its bites: no cap)
        const max=swim?Infinity:(actor.howlJaw||0)>.02||lvl>.02?.34:.21;
        if(jawAngle>max){jawBone.quaternion.copy(jawRest).slerp(jawBone.quaternion,max/jawAngle);jawAngle=max;}
      }
      if(actor.mouthBag)actor.mouthBag.visible=Math.max(lvl*.5,actor.howlJaw||0,jawAngle)>.05;
      actor.howlJaw=0;
      if(swim)sharkLayer(delta);
      // Hind-foot correction runs AFTER victoryGesture and applyBlocking
      // so the animated roar's weight shift does not overwrite grounding.
      if(actor.proc){
        actor.procElapsed+=reduced()?0:delta*1000;
        const clipMs=actor.procStaging?actor.procStaging.clipAt(actor.procElapsed):actor.procElapsed;
        const sample=window.NoahsMooseActionCore.sampleMove(actor.proc,
          clipMs,{reducedMotion:reduced()});
        actor.pose(sample.pose);
      }
    };
    actor.groundHindFeet=()=>{
      if(id!=='bear'||!hindFeet.length)return;
      const sole=soleHeight();
      if(sole===null)return;
      if(actor.soleRest===null){actor.soleRest=sole;return;}
      const delta=actor.soleRest-sole;
      // We only compensate for small shifts; this isn't a substitute for
      // full IK and must not haul the whole bear upward after a big pose.
      pivot.position.y+=Math.max(-.055,Math.min(.055,delta*.55));
    };
    actor.idle=()=>{
      actor.resetHowlFace?.();
      resetApplied(actor);actor.proc=null;actor.procElapsed=0;actor.sproc=null;
      actor.soleRest=null;
      actor.react=null;orientation.position.y=0;
      pivot.position.set(actor.baseX,0,0);pivot.rotation.set(0,0,0,'XYZ');if(actor.mouthLight)actor.mouthLight.intensity=0;
      orientation.rotation.set(0,(slot===0?Math.PI/2:-Math.PI/2)+yaw[id],0);
      actor.native('idle');
    };
    actor.destroy=()=>{resetApplied(actor);mixer.stopAllAction();for(const ink of actor.inks||[])ink.material.dispose();layout.remove(pivot);};
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
    const forest=Boolean(window.NoahsForestArena);
    scene.add(forest?new THREE.HemisphereLight(0xdcecff,0x4a5a32,1.9):new THREE.HemisphereLight(0xf6e4c0,0x344b4c,2.0));
    const sun=new THREE.DirectionalLight(0xffdeb0,3.4);
    sun.position.set(-4,8,5);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-7;sun.shadow.camera.right=7;
    sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;
    scene.add(sun);
    const fill=new THREE.DirectionalLight(0xb9d7d6,1.4);
    fill.position.set(5,3,-4);scene.add(fill);
    // Warm procedural key light for charged attacks and the winner.
    // Short reach: it lights the attacker's face, not the downed loser, whose
    // pale belly fur turned white under sun + hemisphere + this light.
    focusLight=new THREE.PointLight(0xffbb72,0,5.5,1.9);
    focusLight.position.set(0,2.0,2);scene.add(focusLight);
    // PS2-era forest arena (sky dome, tree-line panorama, billboard trees,
    // grass with a worn clearing). Scenery stays behind the fighters and off to
    // the sides so no cinematic camera is ever blocked. See forest-arena.js.
    if(forest){
      forestRoot=window.NoahsForestArena.build(THREE,scene,{shadows:true});
      forestFog=scene.fog;
    }
    else{
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
    }
    // Preserve the cleaner 9:13 AM ground treatment. The additional
    // geometric trees and rocks from the later pass occupied the foreground
    // and made the 3D stage less readable; ground and soft grass remain.
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
    const soloT=timing?.solo?timing:null;
    const hitPhase=soloT?elapsed>=soloT.landAt&&elapsed<soloT.landAt+650:
      actionTime>=contact&&actionTime<contact+650;
    const victor=event.finished&&elapsed>=(timing?.victoryStart||Infinity);
    const heroTime=victor?elapsed-timing.victoryStart:0;
    // Hold a clean winning portrait instead of floating white bubbles
    // cluttering Bear's face throughout the final roar.
    // Solo attack films carry their own flame aura; the floating charge
    // bubbles on top read as cheap, so they only appear for the landing dust.
    const cleanPortrait=(victor&&heroTime>=cinematics.VICTORY_HOWL_START_MS)||
      Boolean(timing?.solo&&!hitPhase);
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
      hitPhase?(soloT?(elapsed-soloT.landAt):(actionTime-contact))/650:
      (elapsed-timing.victoryStart)/4000;
    const colors={starfall:0xffd28d,storm:0xb9d6ff,tide:0x78e8da,
      eclipse:0xd7a4ff,dawn:0xffce85,charge:0xffb968,
      dust:0xded0b0,triumph:0xf8e5a7};
    if(shockRing){
      shockRing.visible=false;
      if(hitPhase){
        const age=Math.max(0,soloT?elapsed-soloT.landAt:actionTime-contact);
        const size=.65+age/245;
        shockRing.position.x=soloT?(actors[event.defender]?.pivot.position.x??target):target;
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
        x=(soloT?(actors[event.defender]?.pivot.position.x??target):target)+Math.cos(a)*radius;
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
      material.opacity=cleanPortrait||kind==='dust'||kind==='triumph'?0:Math.max(0,Math.min(.85,alpha));
    }
  }
  // Fire void behind the attacker during a solo strike: a camera-facing
  // plane placed just beyond the animal, so the forest disappears and only
  // the burning animal remains (as in the reference footage).
  let flameTex=null;
  function flameSpriteTexture(){
    if(flameTex)return flameTex;
    const c=document.createElement('canvas');c.width=64;c.height=128;
    const g=c.getContext('2d'),img=g.createImageData(64,128),d=img.data;
    for(let y=0;y<128;y++)for(let x=0;x<64;x++){
      const u=(x-32)/32,v=y/128;                     // v: 0 top, 1 base
      const width=.18+.82*Math.pow(v,.7);             // teardrop: narrow tip, round base
      const r=Math.abs(u)/width,core=Math.max(0,1-r)*Math.min(1,(1-v)*6)*Math.min(1,v*2.4);
      const flick=.85+.15*Math.sin(x*.7+y*.31);
      const a=Math.pow(core,1.4)*flick;
      const k=(y*64+x)*4,hot=Math.pow(core,2.2);
      d[k]=255;d[k+1]=Math.min(255,90+165*hot);d[k+2]=Math.min(255,20+140*hot*hot);d[k+3]=Math.min(255,a*255);
    }
    g.putImageData(img,0,0);
    flameTex=new THREE.CanvasTexture(c);
    if(THREE.SRGBColorSpace)flameTex.colorSpace=THREE.SRGBColorSpace;
    return flameTex;
  }
  // Tileable value-noise fBm painted through a fire palette: rolling
  // flame and smoke, like the arcade's burning backdrop.
  function fireCanvas(){
    const S=512,c=document.createElement('canvas');c.width=c.height=S;
    const g=c.getContext('2d'),img=g.createImageData(S,S),d=img.data;
    let seed=97;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const lattices=[4,8,16,32,64,128].map(p=>({p,v:Float32Array.from({length:p*p},rnd)}));
    const sm=t=>t*t*(3-2*t);
    const vn=(L,x,y)=>{const p=L.p,xi=Math.floor(x),yi=Math.floor(y),fx=sm(x-xi),fy=sm(y-yi);
      const at=(a,b)=>L.v[((b%p+p)%p)*p+((a%p+p)%p)];
      const A=at(xi,yi),B=at(xi+1,yi),C=at(xi,yi+1),D=at(xi+1,yi+1);
      return A+(B-A)*fx+(C-A)*fy+(A-B-C+D)*fx*fy;};
    const pal=[[0,[18,2,0]],[.32,[96,12,2]],[.5,[196,46,6]],[.66,[246,120,22]],[.8,[255,196,70]],[1,[255,246,196]]];
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      let f=0,amp=.55,tot=0;
      for(const L of lattices){f+=vn(L,x/S*L.p,y/S*L.p)*amp;tot+=amp;amp*=.52;}
      f/=tot;
      // warp the field upward into tongues
      const t=Math.max(0,Math.min(1,(f-.16)*2.0));
      let i=0;while(i<pal.length-2&&t>pal[i+1][0])i++;
      const [t0,c0]=pal[i],[t1,c1]=pal[i+1],k=(t-t0)/(t1-t0),o=(y*S+x)*4;
      for(let ch=0;ch<3;ch++)d[o+ch]=c0[ch]+(c1[ch]-c0[ch])*k;
      d[o+3]=255;
    }
    g.putImageData(img,0,0);return c;
  }
  let fireVoid=null;const backdropTex={};
  let forestRoot=null,forestFog=null;
  // The film never leaves the arena (the reference's plains *is* its arena).
  // Only the victim's launch is re-lit: a red sky and a red-washed stage.
  let stageMats=null,stageRed=0,skyMesh=null,skyMap=null,redSkyTex=null,fogBase=null;
  function redSkyCanvas(){
    const W=256,H=256,c=document.createElement('canvas');c.width=W;c.height=H;
    const g=c.getContext('2d'),img=g.createImageData(W,H),d=img.data;
    const stops=[[0,[44,10,34]],[.28,[110,22,52]],[.42,[176,40,58]],[.5,[236,104,74]],[.56,[196,56,44]],[1,[120,28,24]]];
    let seed=41;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const P=16,lat=Float32Array.from({length:P*P},rnd);
    const vn=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,
      at=(a,b)=>lat[((b%P+P)%P)*P+((a%P+P)%P)],sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
      const A=at(xi,yi),B=at(xi+1,yi),C=at(xi,yi+1),D=at(xi+1,yi+1);
      return A+(B-A)*sx+(C-A)*sy+(A-B-C+D)*sx*sy;};
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const v=y/H;let i=0;while(i<stops.length-2&&v>stops[i+1][0])i++;
      const [v0,c0]=stops[i],[v1,c1]=stops[i+1],k=(v-v0)/(v1-v0);
      const cloud=v<.5?Math.max(0,vn(x/W*P,y/H*P*.5)*.9+vn(x/W*P*2,y/H*P)*.5-.62)*(1-Math.abs(v-.36)*2.4):0;
      const o=(y*W+x)*4;
      for(let ch=0;ch<3;ch++)d[o+ch]=Math.min(255,c0[ch]+(c1[ch]-c0[ch])*k+cloud*[150,90,90][ch]);
      d[o+3]=255;
    }
    g.putImageData(img,0,0);
    const t=new THREE.CanvasTexture(c);if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;
    return t;
  }
  // Graded 0..1 (not on/off): the red launch light fades back to daylight
  // over the landing shot instead of hard-cutting orange → green.
  let redSkyMesh=null,stageKind='red',cosmicSkyTex=null;
  function cosmicSkyCanvas(){
    const W=256,H=256,c=document.createElement('canvas');c.width=W;c.height=H;
    const g=c.getContext('2d');
    const grad=g.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#07031a');grad.addColorStop(.35,'#1d0b4a');grad.addColorStop(.48,'#5a2a9c');
    grad.addColorStop(.53,'#f0c060');grad.addColorStop(.6,'#3a1660');grad.addColorStop(1,'#12062a');
    g.fillStyle=grad;g.fillRect(0,0,W,H);
    let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    for(let i=0;i<260;i++){const x=rnd()*W,y=rnd()*H*.5,r=rnd()<.08?1.4:.6;
      g.fillStyle=`rgba(255,${235+rnd()*20|0},${200+rnd()*55|0},${.5+rnd()*.5})`;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
    const t=new THREE.CanvasTexture(c);if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;
    return t;
  }
  function setStage(level,kind='red'){
    if(!forestRoot)return;
    if(!stageMats){
      stageMats=[];
      skyMesh=forestRoot.getObjectByName('forest-sky');skyMap=skyMesh?.material.map||null;
      forestRoot.traverse(o=>{if(!o.isMesh||o===skyMesh)return;
        for(const m of [].concat(o.material))
          if(m?.color&&!stageMats.includes(m)){m.userData.stageBase=m.color.clone();
            m.userData.stageRed=m.color.clone().multiply(new THREE.Color(1,.34,.26));
            m.userData.stageCosmic=m.color.clone().multiply(new THREE.Color(.42,.34,.78));stageMats.push(m);}});
      fogBase=scene.fog?.color?.clone()||null;
    }
    const k=Math.max(0,Math.min(1,Number(level)||0));
    if(kind!==stageKind&&k>0){stageKind=kind;stageRed=-1;
      if(redSkyMesh){if(kind==='cosmic'&&!cosmicSkyTex)cosmicSkyTex=cosmicSkyCanvas();
        redSkyMesh.material.map=kind==='cosmic'?cosmicSkyTex:redSkyTex;redSkyMesh.material.needsUpdate=true;}}
    if(Math.abs(k-stageRed)<.015&&!(k===0&&stageRed!==0)&&!(k===1&&stageRed!==1))return;
    stageRed=k;
    const target=stageKind==='cosmic'?'stageCosmic':'stageRed';
    for(const m of stageMats)m.color.copy(m.userData.stageBase).lerp(m.userData[target],k);
    if(skyMesh&&k>0&&!redSkyMesh){
      if(!redSkyTex)redSkyTex=redSkyCanvas();
      if(stageKind==='cosmic'&&!cosmicSkyTex)cosmicSkyTex=cosmicSkyCanvas();
      // A second dome just inside the sky carries the red sky; its opacity
      // is the cross-fade (swapping the one texture could only cut).
      redSkyMesh=new THREE.Mesh(skyMesh.geometry,new THREE.MeshBasicMaterial({map:stageKind==='cosmic'?cosmicSkyTex:redSkyTex,transparent:true,
        opacity:0,depthWrite:false,fog:false,side:skyMesh.material.side}));
      redSkyMesh.position.copy(skyMesh.position);redSkyMesh.quaternion.copy(skyMesh.quaternion);
      redSkyMesh.scale.copy(skyMesh.scale).multiplyScalar(.995);
      redSkyMesh.renderOrder=(skyMesh.renderOrder||0)+1;skyMesh.parent.add(redSkyMesh);
    }
    if(redSkyMesh){redSkyMesh.material.opacity=k;redSkyMesh.visible=k>0;}
    if(scene.fog&&fogBase)scene.fog.color.copy(fogBase).lerp(new THREE.Color(stageKind==='cosmic'?0x2a1650:0xb8463a),k);
  }
  // Super Miracle backdrop: a deep indigo/violet vortex with gold and cyan
  // star dust (original procedural texture, same plane as the fire void).
  function cosmicCanvas(){
    const W=512,H=512,c=document.createElement('canvas');c.width=W;c.height=H;
    const g=c.getContext('2d');
    const bg=g.createRadialGradient(W/2,H/2,8,W/2,H/2,W*.72);
    bg.addColorStop(0,'#d9c4ff');bg.addColorStop(.05,'#7a4fd0');bg.addColorStop(.25,'#33157a');bg.addColorStop(.6,'#140840');bg.addColorStop(1,'#05021a');
    g.fillStyle=bg;g.fillRect(0,0,W,H);
    let seed=19;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    g.globalCompositeOperation='lighter';
    for(let arm=0;arm<4;arm++)for(let i=0;i<220;i++){
      const u=i/220,a=arm*Math.PI/2+u*5.2,r=u*W*.62;
      const x=W/2+Math.cos(a)*r+(rnd()-.5)*26*u,y=H/2+Math.sin(a)*r+(rnd()-.5)*26*u;
      g.fillStyle=`rgba(${120+rnd()*70|0},${90+rnd()*80|0},235,${.025+.05*(1-u)})`;
      g.beginPath();g.arc(x,y,3+7*(1-u),0,7);g.fill();
    }
    for(let i=0;i<420;i++){const x=rnd()*W,y=rnd()*H,r=rnd()<.06?1.8:.7,gold=rnd()<.35;
      g.fillStyle=gold?`rgba(255,226,140,${.6+rnd()*.4})`:`rgba(170,240,255,${.5+rnd()*.5})`;
      g.beginPath();g.arc(x,y,r,0,7);g.fill();}
    g.globalCompositeOperation='source-over';
    return c;
  }
  function makeBackdropTexture(kind){
    const c=kind==='cosmic'?cosmicCanvas():fireCanvas();
    const t=new THREE.CanvasTexture(c);
    // the fire tiles; the vortex is one centred image (tiling cut it into crescents)
    if(kind==='cosmic'){t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;}
    else{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.2,.8);}
    if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;
    return t;
  }
  // Four-point star glint on the striking paw at the top of the backswing.
  let glint=null,blob=null;
  function starTexture(){
    const S=128,c=document.createElement('canvas');c.width=c.height=S;
    const g=c.getContext('2d'),img=g.createImageData(S,S),d=img.data;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      const u=(x-S/2)/(S/2),v=(y-S/2)/(S/2),r=Math.hypot(u,v);
      const ray=Math.max(Math.exp(-Math.abs(v)*26)*(1-Math.abs(u)),Math.exp(-Math.abs(u)*26)*(1-Math.abs(v)));
      const diag=.35*Math.max(Math.exp(-Math.abs(u-v)*30),Math.exp(-Math.abs(u+v)*30))*Math.max(0,1-r*1.6);
      const core=Math.exp(-r*r*40),a=Math.min(1,ray+diag+core);
      const o=(y*S+x)*4;d[o]=255;d[o+1]=255;d[o+2]=Math.min(255,225+30*core);d[o+3]=a*255;
    }
    g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);
    if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function paintGlint(view,attacker,time){
    if(!scene)return;
    if(!glint){
      glint=new THREE.Sprite(new THREE.SpriteMaterial({map:starTexture(),transparent:true,
        blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,fog:false}));
      glint.renderOrder=30;glint.visible=false;scene.add(glint);
    }
    const k=view?.glint||0;
    if(k<=.01||!attacker?.joint?.size||!attacker.pivot.visible){glint.visible=false;return;}
    // The striking paw: whichever front foot is highest right now. The Moose
    // strikes with its antlers: the glint sits above its head on the tines.
    const v=new THREE.Vector3();let best=null,bestY=-Infinity;
    attacker.model.updateMatrixWorld(true);
    if(attacker.id==='moose'){
      const head=attacker.joint.get('RigHead');
      if(head){best=head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.75*(cinematics.SOLO_SCALE?.moose||1),0));}
    }
    if(!best)for(const b of attacker.joint.values()){
      if(!/F.*Leg.*(Digit|Ankle)|Hoof|Hand/i.test(b.name))continue;
      b.getWorldPosition(v);if(v.y>bestY){bestY=v.y;best=v.clone();}
    }
    if(!best){glint.visible=false;return;}
    const sc=(cinematics.SOLO_SCALE?.[attacker.id]||1)*(.5+1.5*k);
    glint.position.copy(best);glint.scale.set(sc,sc,1);
    glint.material.rotation=time*.0012;glint.material.opacity=Math.min(1,k*1.2);
    glint.visible=true;
  }
  // The blow lands on the victim: a white-hot star burst on its body for the
  // first quarter-second of the launch.
  let impactStar=null,impactRing=null;
  function paintImpact(view,defender){
    if(!scene)return;
    if(!impactStar){
      impactStar=new THREE.Sprite(new THREE.SpriteMaterial({map:starTexture(),transparent:true,color:0xfff0c8,
        blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,fog:false}));
      impactStar.renderOrder=31;impactStar.visible=false;scene.add(impactStar);
    }
    if(!impactRing){
      const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
      const gr=g.createRadialGradient(64,64,30,64,64,62);
      gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.55,'rgba(255,250,220,.9)');gr.addColorStop(.75,'rgba(160,235,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;g.fillRect(0,0,128,128);
      impactRing=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,
        blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,fog:false}));
      impactRing.renderOrder=32;impactRing.visible=false;scene.add(impactRing);
    }
    const k=view?.impact||0;
    if(k<=.01||!defender||reduced()){impactStar.visible=false;impactRing.visible=false;return;}
    const sc=(cinematics.SOLO_SCALE?.[defender.id]||1);
    const c=defender.joint?.get('RigSpine2')||defender.joint?.get('RigChest')||defender.joint?.get('RigSpine1');
    const v=view.contact&&sequence?.contactPoint?sequence.contactPoint.clone():
      c?c.getWorldPosition(new THREE.Vector3()):defender.pivot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.9*sc,0));
    const r=view.ring||0;
    if(r>.01){const u=1-r;impactRing.position.copy(v);impactRing.scale.setScalar(sc*(.6+4.2*u));
      impactRing.material.opacity=Math.min(1,r*1.4);impactRing.visible=true;}else impactRing.visible=false;
    const grow=1-k;
    impactStar.position.copy(v);impactStar.scale.setScalar(sc*(1.4+2.6*grow));
    impactStar.material.opacity=Math.min(1,k*1.6);impactStar.material.rotation=grow*.6;
    impactStar.visible=true;
  }
  // Dark oval under the tumbling victim, shrinking as it rises.
  function paintLaunchShadow(view,defender){
    if(!scene)return;
    if(!blob){
      const c=document.createElement('canvas');c.width=c.height=64;
      const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,31);
      gr.addColorStop(0,'rgba(0,0,0,.85)');gr.addColorStop(.6,'rgba(0,0,0,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.fillRect(0,0,64,64);
      blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({
        map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
      blob.rotation.x=-Math.PI/2;blob.position.y=.03;blob.renderOrder=2;blob.visible=false;scene.add(blob);
    }
    const l=view?.launch;
    if(!l||l.landed||!defender){blob.visible=false;return;}
    const s=(cinematics.SOLO_SCALE?.[defender.id]||1)*Math.max(.9,2.4-.35*l.y);
    blob.position.x=defender.pivot.position.x;blob.position.z=0;
    blob.scale.set(s*1.3,s*.75,1);blob.material.opacity=Math.max(.3,.7-.08*l.y);
    blob.visible=true;
  }
  // A camera-facing backdrop placed just beyond the animal on screen:
  // a fire void behind the striking attacker, open blue sky behind the
  // launched victim (the reference's two solo-shot backgrounds).
  function paintSolo(time){
    const view=sequence?.solo&&!reduced()?
      cinematics.soloView(sequence.event,sequence.elapsed,nativeLength(sequence.event)):null;
    const attacker=sequence?actors[sequence.event.attacker]:null;
    const defender=sequence?actors[sequence.event.defender]:null;
    for(const actor of actors){if(actor)actor.pivot.visible=true;}
    if(attacker)attacker.pivot.visible=view?view.showAttacker:true;
    if(defender)defender.pivot.visible=view?view.showDefender:true;
    const timing=sequence?cinematics.duration(sequence.event,nativeLength(sequence.event)):null;
    const victor=Boolean(sequence?.event?.finished&&timing&&sequence.elapsed>=timing.victoryStart&&!reduced());
    for(const actor of actors){
      const gold=actor===attacker&&sequence?.event?.goldChange&&(view?.active||victor)?1:0;
      actor?.setAura?.(actor===attacker&&(view?.active||victor)?(victor?1:Math.max(view.aura,gold*.6)):0,time||0,gold);
      if(actor)actor.roarLevel=actor===attacker&&view?view.roar:0;
    }
    // the animal in the spin close-up growls (head up, jaw parted / antler toss)
    if(!sequence&&spinFeature&&!reduced()){
      const a=spinFeature.age;
      spinFeature.actor.roarLevel=.55*Math.min(1,a/260)*(a>1150?Math.max(0,1-(a-1150)/300):1);
    }
    // Super Miracle keeps its full cosmic sky; the ordinary launch is a warm
    // half-strength wash so the forest still reads as the same daylight place.
    const sup=Boolean(sequence?.event?.superMiracle);
    setStage(view?.stage==='red'?view.redSky*(sup?1:.5):0,sup?'cosmic':'red');
    // the cosmic void is opaque from its first frame (the fire one fades in):
    // hide the forest with it, or a strip of ground and grass shows under it
    if(forestRoot)forestRoot.visible=!(view?.fire>(view?.fireKind==='cosmic'?0:.55));
    paintGlint(view,attacker,time||0);
    paintLaunchShadow(view,defender);
    paintImpact(view,defender);
    const cam=filmCamera||camera;
    const kind=view?.fire?(view.fireKind||'fire'):null;
    const subject=kind?attacker:defender;
    if(!kind||!cam||!subject){if(fireVoid)fireVoid.visible=false;return;}
    if(!fireVoid){
      fireVoid=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({
        transparent:true,opacity:0,depthWrite:true,fog:false}));
      scene.add(fireVoid);
    }
    const tex=backdropTex[kind]||(backdropTex[kind]=makeBackdropTexture(kind));
    if(fireVoid.material.map!==tex){fireVoid.material.map=tex;fireVoid.material.needsUpdate=true;}
    const at=subject.pivot.getWorldPosition(new THREE.Vector3());
    const dist=cam.position.distanceTo(at)+3.2;
    const dir=new THREE.Vector3();cam.getWorldDirection(dir);
    fireVoid.position.copy(cam.position).addScaledVector(dir,dist);
    fireVoid.quaternion.copy(cam.quaternion);
    // Square and oversized: never stretched, always covers any aspect ratio.
    const h=2*dist*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))/(cam.zoom||1);
    const side=h*Math.max(1,cam.aspect||1,16/9)*1.6;
    fireVoid.scale.set(side,side,1);
    if(kind==='fire'){
      tex.offset.set(Math.sin(time*.0003)*.04,((time*.00042)%1));
      fireVoid.material.color.setScalar(.92+.08*Math.sin(time*.02));
      fireVoid.material.opacity=view.fire;
    }else{
      tex.offset.set((time*.00004)%1,0);
      fireVoid.material.color.setScalar(1);
      fireVoid.material.opacity=1;
    }
    fireVoid.visible=true;
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
      beat.solo&&(beat.beat==='TITLE'||beat.beat==='ATTACK')?2.4:
      beat.beat==='VICTORY'?1.1:beat.beat==='CONTACT'?1.2:0;
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
    // PS2-era image: render at roughly console resolution (≈600 lines) and
    // let the browser scale it up, which gives the soft, slightly smeared
    // look of a 2000s TV picture instead of razor-sharp modern WebGL.
    const PS2_LINES=600;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6,PS2_LINES/box.height));
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
  function bearMouthStatus(){
    const caps=actors.find(actor=>actor?.id==='bear')?.howlCapabilities;
    if(!caps?.head)return 'HEAD BONE NOT FOUND · RIG CHECK NEEDED';
    if(caps?.nativeRoar&&caps?.roarJawTracks)return 'NATIVE ROAR + JAW KEYS';
    if(caps?.nativeRoar)return 'NATIVE ROAR LOADED · VERIFY MOUTH';
    if(caps?.jaw||caps?.morphs)return 'MOUTH RIG AVAILABLE';
    return 'BODY HOWL ONLY · NO MOUTH CONTROL';
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
      detail.textContent=bearReview.cameraShot==='finale'&&
        ['roar','hold'].includes(bearReview.howlStage)?
        'BEAR HOWL · '+bearMouthStatus():
        angles[bearReview.cameraShot]||
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
      '<button type="button" data-bear-review-howl>REPLAY HOWL ONLY</button>'+
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
    bearReview.howlStage=null;
    bearReview.event=bearReview.events[index];
    bearReview.countdown=0;
    bearReview.done=false;
    actors.forEach(actor=>actor?.idle());
    shownEvent=bearReview.event.key;
    beginEvent(bearReview.event);
    updateReviewToolbar();
    reviewChange();
  }
  function replayBearHowl(){
    if(!bearReview?.events?.[2]||!cinematics)return false;
    const event=bearReview.events[2];
    bearReview.index=2;bearReview.event=event;
    bearReview.cameraShot=null;bearReview.howlStage=null;
    bearReview.countdown=0;bearReview.done=false;
    actors.forEach(actor=>actor?.idle());
    shownEvent=event.key;beginEvent(event);
    const timeline=cinematics.duration(event,nativeLength(event));
    // This is a non-scoring film rehearsal, not a shortcut through a real
    // fight. Start with the same winner/victim poses as the longer review.
    sequence.elapsed=timeline.victoryStart;
    sequence.attackStarted=true;sequence.contact=true;
    sequence.finished=true;sequence.victoryPlayed=true;
    actors[event.attacker]?.native(actors[event.attacker].asset?.clips?.walk?'walk':'idle');
    actors[event.defender]?.native('knockout');
    updateReviewToolbar();
    reviewChange();
    startLoop();
    return true;
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
      const howlStage=current.beat==='VICTORY'&&current.shot==='finale'?
        cinematics.bearHowl(current.local).phase:null;
      if(shot!==bearReview.cameraShot||howlStage!==bearReview.howlStage){
        bearReview.cameraShot=shot;
        bearReview.howlStage=howlStage;
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
      victoryRearAt:null,victoryPlayed:false,roarPlayed:false,
      victoryLowered:false,victoryMoved:false,victoryWalkStopped:false,
      victoryPosition:'upright'};
    const attacker=actors[event.attacker];
    sequence.solo=Boolean(cinematics?.soloSpec?.(event));
    sequence.closeDist=sequence.solo?0:closingDistance(event);
    if(attacker?.asset?.clips?.angry)attacker.native('angry');
  }
  // How far the attacker's pivot must additionally travel so its strike
  // actually reaches the defender. Measured once per exchange from the live
  // idle skeletons (relative to each pivot), so it is an absolute bound,
  // never accumulated per frame.
  function buildMouthBag(model,jawBone){
    let skin=null;model.traverse(o=>{if(!skin&&o.isSkinnedMesh&&o.skeleton?.bones.includes(jawBone))skin=o;});
    if(!skin)return;
    // Clones of the same imported model share geometry: build once, reuse.
    if(skin.geometry.userData.mouthBag){attachMouthBag(skin,skin.geometry.userData.mouthBag);return;}
    const g=skin.geometry,P=g.attributes.position,N=g.attributes.normal,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight;
    const ji=skin.skeleton.bones.indexOf(jawBone);
    const at=i=>g.index?g.index.getX(i):i; // FBXLoader output is usually non-indexed
    // Muzzle region from the jaw's own vertices (bind/mesh space), so the
    // bag follows this rig's proportions instead of hard-coded numbers.
    const box=new THREE.Box3(),v=new THREE.Vector3();
    for(let i=0;i<P.count;i++){let w=0;for(let c=0;c<4;c++)if(SI.getComponent(i,c)===ji)w+=SW.getComponent(i,c);
      if(w>.5)box.expandByPoint(v.fromBufferAttribute(P,i));}
    if(box.isEmpty()){console.info('[arena3d] bear mouth bag skipped: no jaw vertices');return;}
    const size=box.getSize(new THREE.Vector3()),region=box.clone();
    region.expandByVector(new THREE.Vector3(size.x*.15,size.y*.25,size.z*1.1));
    // Stop below the nose leather: thin nostril folds z-fight with an inset bag.
    region.max.z=box.max.z+size.z*.2;
    const head=g.groups.find(gr=>gr.materialIndex===1)||g.groups[0];
    const keep=[];
    for(let t=head.start;t<head.start+head.count;t+=3){
      let inside=true;
      for(let k=0;k<3;k++)if(!region.containsPoint(v.fromBufferAttribute(P,at(t+k)))){inside=false;break;}
      if(inside)keep.push(at(t),at(t+1),at(t+2));
    }
    if(keep.length<30)return;
    paintInnerLips(skin,box,at,i=>{let w=0;for(let c=0;c<4;c++)if(SI.getComponent(i,c)===ji)w+=SW.getComponent(i,c);return w;});
    const inset=Math.max(size.x,size.y,size.z)*.012;
    const pos=new Float32Array(P.count*3);
    for(let i=0;i<P.count;i++){
      pos[i*3]=P.getX(i)-(N?N.getX(i)*inset:0);pos[i*3+1]=P.getY(i)-(N?N.getY(i)*inset:0);pos[i*3+2]=P.getZ(i)-(N?N.getZ(i)*inset:0);
    }
    const bag=new THREE.BufferGeometry();
    bag.setAttribute('position',new THREE.BufferAttribute(pos,3));
    if(N)bag.setAttribute('normal',N);
    bag.setAttribute('skinIndex',SI);bag.setAttribute('skinWeight',SW);
    bag.setIndex(keep);
    g.userData.mouthBag=bag;
    attachMouthBag(skin,bag);
    console.info('[arena3d] bear mouth bag',keep.length/3,'triangles');
  }
  function attachMouthBag(skin,bag){
    const mat=new THREE.MeshStandardMaterial({color:0x7a2629,roughness:.55,metalness:0,side:THREE.BackSide,
      emissive:new THREE.Color(0x2a0707),emissiveIntensity:1});
    const mesh=new THREE.SkinnedMesh(bag,mat);
    mesh.name='MouthBag';mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
    mesh.position.copy(skin.position);mesh.quaternion.copy(skin.quaternion);mesh.scale.copy(skin.scale);
    skin.parent.add(mesh);mesh.bind(skin.skeleton,skin.bindMatrix);
  }
  // The inner lip faces are mapped to the dark lip-line texels of the head
  // atlas. Closed, they are folded away; open, they stretch into a big black
  // box. Re-assign exactly those triangles (dark texel + inside the jaw's
  // own region) to a gum material via extra draw groups. Nothing else in the
  // texture or the closed face changes.
  function paintInnerLips(skin,jawBox,at,jawWeight){
    const g=skin.geometry,P=g.attributes.position,UV=g.attributes.uv;
    const mats=Array.isArray(skin.material)?skin.material:null;
    if(!mats||!UV||g.userData.innerLipsDone)return;
    const pad=jawBox.getSize(new THREE.Vector3()).multiplyScalar(.18);
    const inner=jawBox.clone().expandByVector(pad);
    // No upward padding: the black nose leather sits just above the jaw.
    // (The FBX mesh is Z-up in its own space; the jaw box's top is the lip line.)
    inner.max.z=jawBox.max.z;
    const v=new THREE.Vector3(),c=new THREE.Vector3();
    let headGroup=null;
    for(const gr of g.groups){
      for(let t=gr.start;t<gr.start+gr.count;t+=3){
        if(inner.containsPoint(v.fromBufferAttribute(P,at(t)))){headGroup=gr;break;}
      }
      if(headGroup)break;
    }
    const image=mats[headGroup?.materialIndex]?.map?.image;
    if(!headGroup||!image?.width)return;
    const canvas=document.createElement('canvas');
    canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0);
    const px=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const lum=(u,w)=>{const x=Math.min(canvas.width-1,Math.max(0,Math.floor(u*canvas.width)));
      const y=Math.min(canvas.height-1,Math.max(0,Math.floor((1-w)*canvas.height)));
      const i=(y*canvas.width+x)*4;return (px[i]*.3+px[i+1]*.59+px[i+2]*.11)/255;};
    const pick=[];
    for(let t=headGroup.start;t<headGroup.start+headGroup.count;t+=3){
      c.set(0,0,0);let u=0,w=0;
      for(let k=0;k<3;k++){c.add(v.fromBufferAttribute(P,at(t+k)));u+=UV.getX(at(t+k));w+=UV.getY(at(t+k));}
      // Only faces that move with the jaw stretch open; the (head-only) nose
      // leather is dark too but must stay untouched.
      const jawy=Math.max(jawWeight(at(t)),jawWeight(at(t+1)),jawWeight(at(t+2)));
      pick.push(jawy>.1&&inner.containsPoint(c.multiplyScalar(1/3))&&lum(u/3,w/3)<.1);
    }
    const count=pick.filter(Boolean).length;
    if(count<8||count>600)return;
    const gum=new THREE.MeshStandardMaterial({color:0x9a3b3f,roughness:.85,metalness:0,
      emissive:new THREE.Color(0x3a0c10),emissiveIntensity:1,side:THREE.DoubleSide});
    mats.push(gum);const gumIndex=mats.length-1;
    const rebuilt=[];
    for(const gr of g.groups){
      if(gr!==headGroup){rebuilt.push(gr);continue;}
      let runStart=gr.start,runGum=pick[0];
      for(let k=1;k<=pick.length;k++){
        if(k===pick.length||pick[k]!==runGum){
          const start=gr.start+k*3;
          rebuilt.push({start:runStart,count:start-runStart,materialIndex:runGum?gumIndex:gr.materialIndex});
          runStart=start;runGum=pick[k];
        }
      }
    }
    g.clearGroups();for(const gr of rebuilt)g.addGroup(gr.start,gr.count,gr.materialIndex);
    g.userData.innerLipsDone=true;
    console.info('[arena3d] bear inner lips',count,'triangles,',rebuilt.length,'draw groups');
  }
  function closingDistance(event){
    const attacker=actors[event.attacker],defender=actors[event.defender];
    if(!THREE||!attacker?.joint?.size||!defender?.joint?.size)return 0;
    const dir=event.attacker===0?1:-1,v=new THREE.Vector3();
    const extent=(actor,sign)=>{
      actor.model.updateMatrixWorld(true);let best=0;
      for(const bone of actor.joint.values()){bone.getWorldPosition(v);
        best=Math.max(best,sign*(v.x-actor.pivot.position.x));}
      return best;
    };
    const front=extent(attacker,dir),near=extent(defender,-dir);
    const gap=Math.abs(defender.baseX-attacker.baseX)-front-near;
    const close=gap-cinematics.contactKeep(event.attackerId,event.move);
    return Number.isFinite(close)?Math.max(0,Math.min(1.7,close)):0;
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
      // In the Guts film the Bear charges the lens on all fours: its source
      // attack clip rears upright mid-pounce, which read as a biped stand.
      if(timing?.solo&&timing.strike==='charge'&&attacker?.id==='bear'&&attacker.asset?.clips?.run)
        attacker.native('run',.12);
      else attacker?.move(event.move);
    }
    const actionTime=sequence.elapsed-lead;
    // One source of truth: the director's contact (measured from the clip
    // when available) drives both the 3D reaction and the DOM cinematic.
    const contact=timing?.contact??core.contactMs(event.attackerId,event.move,length);
    if(sequence.attackStarted&&!sequence.contact&&actionTime>=contact){
      sequence.contact=true;
      // In an attack film the victim is off screen at contact; it flails
      // through the launch and takes its real reaction (or its knockout)
      // when it lands in the arena wide.
      defender?.native(sequence.solo||!event.knockout?'hit':'knockout');
      defender?.hitReact?.(event.move,({G:.85,T:.7,P:1,S:1.15}[event.move]||.8)*(event.knockout?1.2:1));
      const pelvis=defender?.joint?.get('RigPelvis');
      if(event.knockout&&pelvis&&THREE)
        sequence.pelvisStand=pelvis.getWorldPosition(new THREE.Vector3()).y;
    }
    // The knockout lands when the loser's pelvis actually reaches the
    // ground in the native death clip — read from the live skeleton, so the
    // thud/dust/shake match whatever clip and rig are loaded.
    if(sequence.solo&&timing?.solo&&sequence.thumpAt==null&&sequence.elapsed>=timing.landAt){
      sequence.thumpAt=sequence.elapsed;
      sequence.thumpX=defender?.pivot.position.x??0;
      if(defender){
        // Body-first: straight into the lying end of the knockout clip.
        defender.currentKey=null;defender.native('knockout',0);
        if(defender.current){const d=defender.current.getClip().duration;defender.current.time=Math.max(0,d-.04);}
      }
      if(!reduced())window.NoahsAudio?.cue('thud');
    }
    if(!sequence.solo&&event.knockout&&sequence.pelvisStand&&sequence.thumpAt==null&&defender){
      const pelvis=defender.joint.get('RigPelvis');
      const y=pelvis.getWorldPosition(new THREE.Vector3()).y;
      if(y<sequence.pelvisStand*.5||actionTime>contact+2600){
        sequence.thumpAt=sequence.elapsed;
        sequence.thumpX=pelvis.getWorldPosition(new THREE.Vector3()).x;
        if(!reduced())window.NoahsAudio?.cue('thud');
      }
    }
    // A survivor holds the downed pose, then scrambles back up.
    if(sequence.solo&&timing?.solo&&!event.knockout&&!sequence.gotUp&&
       sequence.elapsed>=timing.landAt+cinematics.SOLO_MS.downHold+(sequence.event.resurrected?cinematics.SOLO_MS.reviveHold:0)){
      sequence.gotUp=true;
      // Get up by playing the knockout fall backwards (a crossfade from the
      // lying pose to idle squashed the body flat), then settle into idle.
      const ko=defender?.currentKey==='knockout'?defender.current:null;
      if(ko){ko.paused=false;ko.enabled=true;ko.clampWhenFinished=true;ko.setLoop(THREE.LoopOnce,1);
        ko.timeScale=-Math.max(1,ko.getClip().duration/(cinematics.SOLO_MS.getUp/1000));ko.play();sequence.rising=ko;}
      else defender?.native('idle',.25);
    }
    if(sequence.rising&&sequence.rising.time<=.03){
      sequence.rising=null;defender?.native('idle',.12);
    }
    const settle=sequence.solo&&timing?.solo?
      (event.finished?timing.victoryStart:timing.returnAt)-lead:
      core.settleMs(event.attackerId,event.move,length);
    if(sequence.attackStarted&&!sequence.finished&&actionTime>=settle){
      sequence.finished=true;
      if(event.finished){
        // The winner stays on all fours and walks at the lens (reference),
        // never the old upright hind-leg idle.
        if(attacker){
          attacker.pivot.position.y=0;attacker.orientation.rotation.z=0;
          // planted facing the lens (no walk-in): breathing idle under the roar
          attacker.native('idle',.2);
        }
        sequence.victoryPlayed=true;sequence.victoryMoved=true;sequence.victoryLowered=true;
        sequence.victoryPosition='quadruped';
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
    if(sequence.finished&&event.finished&&attacker?.id==='bear'&&timing){
      const v=sequence.elapsed-timing.victoryStart;
      // The original victor lowers to four paws *before* walking into
      // the camera-facing roar. Source motion wins when provided. If not,
      // the required quad Stand_Idle_01 crossfades over a longer interval.
      if(sequence.victoryMoved&&!sequence.victoryWalkStopped&&
         v>=cinematics.VICTORY_APPROACH_END_MS){
        attacker.native('idle',.26);
        sequence.victoryWalkStopped=true;
      }
      // An upright StandHind_Roar clip would pull the character back
      // onto two feet and undo the reference-matched four-paw celebration.
      // Only use native vocals authored for a quadrupedal posture.
      const source=attacker.asset.motionFiles?.roar||'';
      const quadRoar=Boolean(attacker.asset.clips.roar)&&
        !/(?:standhind|hindstand|rear|upright)/i.test(source);
      if(!sequence.roarPlayed&&quadRoar&&sequence.victoryMoved&&
         v>=cinematics.VICTORY_HOWL_CUE_MS-160){
        attacker.native('roar',.26);
        sequence.roarPlayed=true;
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
      if(attacker)bodyHalf(attacker);if(defender)bodyHalf(defender); // measured standing
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
        // Absolute, bounded transform from timeline progress (no per-frame
        // drift): the winner really walks toward centre and the lens, so the
        // camera target that tracks victoryApproach() has a body to follow.
        const approach=cinematics.victoryApproach(sequence.elapsed-timing.victoryStart);
        const facing=event.attacker===0?1:-1;
        attacker.pivot.position.x=attacker.baseX+facing*approach.travel;
        attacker.pivot.position.z=approach.depth;
        // (orientation is left to victoryGesture: zeroing one Euler axis of
        // its leaned 90°-yaw quaternion is gimbal-locked and rolled the Bear.)
        attacker.pivot.position.y=attacker.victoryLift||0;
        attacker.pivot.rotation.set(0,-facing*approach.turn,0);
        // Moose rear-up: pitch the whole body nose-up about its hind feet.
        if(attacker.victoryRear>.001){
          const hindLocal=new THREE.Vector3(-facing*bodyHalf(attacker)*.8,0,0);
          attacker.pivot.updateMatrixWorld(true);
          const before=attacker.pivot.localToWorld(hindLocal.clone());
          attacker.pivot.rotateOnAxis(new THREE.Vector3(0,0,1),facing*attacker.victoryRear);
          attacker.pivot.updateMatrixWorld(true);
          const after=attacker.pivot.localToWorld(hindLocal.clone());
          attacker.pivot.position.add(before.sub(after));
        }
      }
      return;
    }
    const choreo=cinematics.blocking(event,sequence.elapsed,nativeLength(event));
    const direction=event.attacker===0?1:-1;
    const opposite=event.defender===0?-1:1;
    // Use a bounded offset from the beginning of each frame, never '+='.
    // Accumulating frame-by-frame movement caused visible skating/teleports.
    if(attacker){
      // keyframed animals (Moose, Shark) already placed their own travel in tick()
      const keyed=(attacker.id==='moose'&&attacker.proc)||(attacker.swim&&attacker.sproc);
      const source=keyed?attacker.pivot.position.x:attacker.baseX;
      attacker.pivot.position.x=source+direction*(choreo.attackerTravel*
        (attacker.id==='moose'||attacker.swim?.27:1)+(sequence.closeDist||0)*choreo.closing);
      if(attacker.id==='bear'){
        attacker.pivot.position.y=choreo.attackerLift;
        attacker.orientation.rotation.z=direction*choreo.attackerLean;
      }
    }
    const view=sequence.solo?cinematics.soloView(event,sequence.elapsed,nativeLength(event)):null;
    // Contact two-shot: put the attacker's strike against the victim (a cut,
    // so the jump in position is never seen), for the hit-stop only.
    if(view?.contact&&attacker&&defender){
      // Place by the live skeletons, not body length: the attacker's leading
      // bone (+ snout/antler margin) stops at the victim's nearest bone
      // (+ its margin), so heads and antlers never sink into each other.
      const sa=cinematics.SOLO_SCALE?.[attacker.id]||1,sd=cinematics.SOLO_SCALE?.[defender.id]||1;
      attacker.pivot.position.x=defender.pivot.position.x-direction*(bodyHalf(attacker)+bodyHalf(defender));
      attacker.pivot.position.z=0;
      // world x of the attacker's leading tip and the victim's nearest tip;
      // margins point along the attack direction (sign matters for slot 1)
      const front=extent(attacker,direction,'max')+direction*REACH[attacker.id]*sa;
      const near=extent(defender,direction,'min')-direction*REACH_D[defender.id]*sd;
      attacker.pivot.position.x+=near-front;
      // the victim snaps into a flinch: nose-up about its hind feet, shoved back
      const fl=view.flinch||0;defender.flinchLevel=fl;
      if(fl>0){
        const facingD=-direction,hind=new THREE.Vector3(-facingD*bodyHalf(defender)*.8,0,0);
        defender.pivot.updateMatrixWorld(true);const b0=defender.pivot.localToWorld(hind.clone());
        defender.pivot.rotateOnAxis(new THREE.Vector3(0,0,1),facingD*.2*fl);
        defender.pivot.updateMatrixWorld(true);const b1=defender.pivot.localToWorld(hind.clone());
        defender.pivot.position.add(b0.sub(b1));defender.pivot.position.x+=direction*.22*sd*fl;
      }
      // where the blow lands: between the leading bone and the victim's nearest bone, chest high
      const ca=leadPoint(attacker,direction,'max'),cd=leadPoint(defender,direction,'min');
      sequence.contactPoint=ca.add(cd).multiplyScalar(.5);
    }else{if(defender)defender.flinchLevel=0;if(sequence)sequence.contactPoint=null;}
    if(defender&&view?.launch){
      const l=view.launch;
      if(!l.landed){
        // Thrown into the sky, tumbling about its body centre.
        const h=defender.spinCentre??.95*(cinematics.SOLO_SCALE?.[defender.id]||1),th=l.spin;
        // a swimmer is knocked out of its hover: the launch arc carries its
        // body, not body + hover (the Power blast threw the shark out of frame)
        const sink=defender.swim?window.NoahsSharkActionCore.HOVER:0;
        if(defender.swim){
          // A long body turned end over end stood the shark on its tail
          // (Nov 27 recordings): it spins about its own length instead, the
          // swim group's roll (centred on the body), nose dipping as it flies.
          defender.pivot.position.set(defender.baseX+l.drift,l.y-sink,0);
          defender.pivot.rotation.set(0,l.yaw||0,0);
          defender.swim.rotation.z+=th*(defender.slot===0?-1:1);
          defender.swim.rotation.x+=.22*Math.sin(Math.min(Math.PI,th));
        }else if(l.axis==='x'){
          // Roll about the body's OWN length, then turn the rolled body flat
          // (Euler 'YXZ': yaw outermost). With the default order the roll was
          // about the world X axis, which the yaw spin carried across the
          // body: Technique/Power launches ended sitting upright on the rump
          // or on the neck, then snapped flat at the landing (Nov 27 clips).
          const yw=l.yaw||0,s=h*Math.sin(th);
          defender.pivot.position.x=defender.baseX+l.drift-s*Math.sin(yw);
          defender.pivot.position.y=l.y-sink+h*(1-Math.cos(th));
          defender.pivot.position.z=-s*Math.cos(yw);
          defender.pivot.rotation.set(th,yw,0,'YXZ');
        }else{
          defender.pivot.position.x=defender.baseX+l.drift+h*Math.sin(th);
          defender.pivot.position.y=l.y-sink+h*(1-Math.cos(th));
          defender.pivot.position.z=0;
          defender.pivot.rotation.set(0,0,th);
        }
      }else{
        // Landed on its feet in the arena wide, a short bounce, then its reaction.
        defender.pivot.position.x=defender.baseX+l.drift;
        defender.pivot.position.y=l.y;defender.pivot.position.z=0;
        defender.pivot.rotation.set(0,0,0,'XYZ');
      }
      return;
    }
    if(defender&&sequence.solo){defender.pivot.position.y=0;defender.pivot.rotation.z=0;}
    if(defender&&sequence.contact){
      defender.pivot.position.x=defender.baseX+opposite*
        (event.knockout?choreo.defenderKnock:choreo.defenderTravel);
      // Native hit and knockout clips remain the primary reaction.
      if(!event.knockout&&defender.id==='bear')
        defender.orientation.rotation.z=opposite*choreo.defenderLean;
    }
  }
  // While the ATTACK! (power) reels spin, the arcade cuts between close-ups
  // of each animal growling at the lens: wide for 0.7 s, then 1.5 s each.
  let spinKey='',spinAt=0,spinFeature=null;
  function spinCamera(){
    spinFeature=null;
    const st=window.NoahsCombat?.getState?.();
    if(!st||st.phase!=='POWER'||screen()!=='BATTLE_PLAY'||bearReview||!actors[0]?.model||!actors[1]?.model)return null;
    const key=[st.session?.bout,st.round,st.tieCharge].join(':'),now=performance.now();
    if(key!==spinKey){spinKey=key;spinAt=now;}
    const t=now-spinAt;if(t<700)return null;
    const k=Math.floor((t-700)/1500)%2,age=(t-700)%1500;
    const actor=actors[k],H=cinematics.SOLO_SCALE?.[actor.id]||1,X=k===0?-2.02:2.02,f=k===0?1:-1;
    spinFeature={actor,age};
    // low 3/4 front, the head and forequarters filling the frame
    return {x:X+f*3.1*H,y:1.05*H,z:3.3*H,targetX:X+f*.55*H,targetY:1.2*H,zoom:1,beat:'SPIN',shot:'spin'+k};
  }
  function applyCamera(dt){
    if(!camera||!THREE||!cameraLook)return;
    const live=window.NoahsCinematics?.getState();
    // One clock for the camera and the bodies: the overlay's clock runs a
    // frame behind the 3D sequence, so on every cut the camera showed one
    // frame of the old shot with the new pose (the Moose "sliding off
    // screen" after the get-up, the belly frame before the lying pose).
    const own=sequence?.event&&(!live?.event||live.event.key===sequence.event.key);
    const event=own?sequence.event:live?.event||sequence?.event;
    const time=own?sequence.elapsed??0:live?.elapsed??sequence?.elapsed??0;
    const wants=(!reduced()&&event&&cinematics)?
      cinematics.camera(event,time,nativeLength(event)):(!reduced()?spinCamera():null);
    const fit=layout?.scale?.x??1;
    const focusX=(wants?.targetX??0)*fit;
    // Camera azimuth must survive portrait-stage scaling. Scaling the
    // camera's orbit offset by .27 made all four angles indistinguishable.
    const x=focusX+((wants?.x??0)-(wants?.targetX??0));
    const y=wants?.y??3,z=wants?.z??12;
    const focusY=(wants?.targetY??1.18)*fit;
    const wanted=new THREE.Vector3(x,y,z);
    const focus=new THREE.Vector3(focusX,focusY,wants?.targetZ??0);
    const key=event?.key+':'+(wants?.shot||'wide');
    if(key!==lastCameraShot||wants?.snap){
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
      if(wants?.shot==='contact'){
        applyContact(event);
        const k=wants.shake||0,sc=cinematics.SOLO_SCALE?.[actors[event.defender]?.id]||1;
        if(k){const right=new THREE.Vector3(1,0,0).applyQuaternion(filmCamera.quaternion);
          filmCamera.position.addScaledVector(right,.11*k*sc);filmCamera.position.y+=.07*k*sc*(wants.slam?3:1);}
      }
      else if(wants?.lunge>0)applyLunge(event,wants.lunge);
      if(wants?.angle&&!reduced())filmCamera.rotateZ(wants.angle);
      if(wants?.beat==='VICTORY')fitVictoryInFrame(event,wants);
      applyThump(sequence?.elapsed??0);
    }
  }
  // Short, decaying camera shake plus a ground dust ring when a knocked-out
  // animal hits the floor. Deterministic in sequence time; off for reduced motion.
  // A brown dirt plume (soft puffs that billow up and drift) with a few
  // clods thrown out, instead of the old flat ring of glowing dots.
  let dirt=null;
  function puffTexture(){
    const S=64,c=document.createElement('canvas');c.width=c.height=S;
    const g=c.getContext('2d'),img=g.createImageData(S,S),d=img.data;
    let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const blobs=Array.from({length:9},()=>[16+rnd()*32,16+rnd()*32,6+rnd()*10]);
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      let a=0;for(const [bx,by,br] of blobs)a=Math.max(a,1-Math.hypot(x-bx,y-by)/br);
      const edge=Math.max(0,1-Math.hypot(x-32,y-32)/31);
      const o=(y*S+x)*4,shade=.75+.25*(1-y/S);
      d[o]=255*shade;d[o+1]=255*shade;d[o+2]=255*shade;d[o+3]=Math.min(1,a*1.4)*edge*255;
    }
    g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);
    if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function applyThump(time){
    const at=sequence?.thumpAt;
    const age=at==null?Infinity:time-at;
    if(!dirt&&THREE&&scene){
      const tex=puffTexture();dirt=[];
      for(let i=0;i<40;i++){
        const clod=i>=30;
        const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,
          color:clod?0x3e2e1f:[0x7a6248,0x8c7356,0x6b5640,0x9a8466][i%4]}));
        const a=i*2.399963,r=(i%5)/5;
        sp.userData={a,r,clod,up:.6+((i*37)%11)/11,spread:.5+((i*53)%13)/13};
        sp.visible=false;sp.renderOrder=6;scene.add(sp);dirt.push(sp);
      }
    }
    const live=age>=0&&age<1300&&!reduced();
    const scale=(sequence&&cinematics.SOLO_SCALE?.[actors[sequence.event.defender]?.id])||1;
    for(const sp of dirt||[]){
      if(!live){sp.visible=false;continue;}
      const d=sp.userData,t=age/1000;
      if(d.clod){
        const vx=Math.cos(d.a)*1.6*d.spread,vy=2.6+1.8*d.up;
        sp.position.set(sequence.thumpX+vx*t,Math.max(.02,.2+vy*t-4.9*t*t),Math.sin(d.a)*.8*d.spread*t);
        sp.scale.setScalar(.09+.05*d.spread);
        sp.material.opacity=t<.9?1:Math.max(0,1-(t-.9)*4);
      }else{
        // A narrow spray thrown up beside the body (the reference's column
        // of dirt), small puffs that thin out, not a smear over the victim.
        const grow=1-Math.exp(-t*3.6),side=(d.r<.5?-1:1);
        sp.position.set(sequence.thumpX+side*(.55+.5*d.spread)*scale+Math.cos(d.a)*.25*grow,
          (.1+(1.2+1.6*d.up)*grow)*scale,(.35+.3*Math.sin(d.a))*scale);
        sp.scale.setScalar((.28+.75*grow*d.spread)*scale);
        sp.material.opacity=.95*Math.min(1,age/30)*Math.exp(-Math.max(0,t-.3)*2.4);
        sp.material.rotation=d.a+t*.4*(d.r-.5);
      }
      sp.visible=true;
    }
    if(live&&age<420){
      const k=.075*Math.exp(-age/130);
      filmCamera.position.y+=k*Math.sin(age*.11);
      filmCamera.position.x+=k*.6*Math.sin(age*.083+1.3);
    }
  }
  // The strike ends with the attacker driving its face into the lens: dolly
  // from the shot's framing to just in front of the live head bone.
  // Snout / antler reach beyond the last bone (attacker front, victim near side).
  const REACH={bear:.28,moose:.45,shark:.16},REACH_D={bear:.18,moose:.32,shark:.12};
  function bonePositions(actor){
    actor.model.updateMatrixWorld(true);
    const out=[];for(const b of actor.extentBones||actor.joint?.values?.()||[])out.push(b.getWorldPosition(new THREE.Vector3()));
    if(!out.length)out.push(actor.pivot.getWorldPosition(new THREE.Vector3()));
    return out;
  }
  function extent(actor,dir,which){
    const xs=bonePositions(actor).map(p=>p.x*dir);
    return (which==='max'?Math.max(...xs):Math.min(...xs))*dir;
  }
  function leadPoint(actor,dir,which){
    const pts=bonePositions(actor);let best=pts[0];
    for(const p of pts)if(which==='max'?p.x*dir>best.x*dir:p.x*dir<best.x*dir)best=p;
    return best.clone();
  }
  // Half body length (nose to tail along the facing axis), measured once in
  // the idle stance from the live skeleton bounds.
  function bodyHalf(actor){
    if(actor.bodyHalfLen)return actor.bodyHalfLen;
    const box=new THREE.Box3().setFromObject(actor.model),size=box.getSize(new THREE.Vector3());
    actor.bodyHalfLen=Math.max(.5,Math.min(3,Math.max(size.x,size.z)/2));
    return actor.bodyHalfLen;
  }
  // Frame both fighters at the blow from the live bones: 3/4 from the lens
  // side, a touch behind the attacker, wide enough for both heads and feet.
  function applyContact(event){
    const a=actors[event.attacker],d=actors[event.defender];
    if(!a?.model||!d?.model||!filmCamera)return;
    const box=new THREE.Box3().setFromPoints([...bonePositions(a),...bonePositions(d)]);
    box.expandByScalar(.45*Math.max(cinematics.SOLO_SCALE?.[a.id]||1,cinematics.SOLO_SCALE?.[d.id]||1));
    const c=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    const away=event.attacker===0?1:-1;
    const vfov=THREE.MathUtils.degToRad(filmCamera.fov)/Math.max(1,filmCamera.zoom);
    const hfov=2*Math.atan(Math.tan(vfov/2)*filmCamera.aspect);
    const need=Math.max((size.x*1.08)/(2*Math.tan(hfov/2)),(size.y*1.25)/(2*Math.tan(vfov/2)));
    const dir=new THREE.Vector3(-away*.42,.18,1).normalize();
    filmCamera.position.copy(c).addScaledVector(dir,need+size.z*.5);
    filmCamera.lookAt(c.x,c.y*.9,c.z);
  }
  function applyLunge(event,u){
    const actor=actors[event.attacker];
    // the striking part: the head, or the shark's tail for its Tail Lash
    // (its head is turned away then; dollying at it put the lens in its flank)
    const head=actor?.strikeBone?.(event.move)||actor?.joint?.get('RigHead')||actor?.joint?.get('RigNeck');
    if(!head||!filmCamera)return;
    actor.model.updateMatrixWorld(true);
    const h=head.getWorldPosition(new THREE.Vector3());
    const scale=cinematics.SOLO_SCALE?.[actor.id]||1;
    // From in front of the muzzle (chest→head direction), so the face fills
    // the frame (reference 19.6), never the ear or shoulder.
    const fwd=new THREE.Vector3(actor.slot===0?1:-1,.12,0).normalize();
    const toCam=filmCamera.position.clone().sub(h).normalize();
    const dir=fwd.multiplyScalar(.75).add(toCam.multiplyScalar(.25)).normalize();
    // a touch below the head looking up into the face (roaring at the lens)
    const end=h.clone().addScaledVector(dir,2.7*scale);end.y-=.04*scale;
    const e=u*u*(3-2*u);
    filmCamera.position.lerp(end,e);
    filmCamera.lookAt(cameraLook.clone().lerp(h,e));
  }
  function fitVictoryInFrame(event,wants){
    if(!event||wants?.beat!=='VICTORY'||!filmCamera||!THREE)return;
    const winner=actors[event.attacker];
    if(!winner?.joint?.size)return;
    // The earlier 'portrait' put the camera right inside the skinned
    // torso. Reframe against live bone positions, including the top of
    // the animated head and the planted hind paws, not a guessed height.
    const names=wants.shot==='vicRoar'?['RigHead','RigNeck','RigJaw','RigLFLegAnkle','RigRFLegAnkle']:
      ['RigHead','RigNeck','RigChest','RigPelvis',
      'RigLFLeg3','RigRFLeg3','RigLBLeg3','RigRBLeg3',
      'RigLFLegAnkle','RigRFLegAnkle','RigLBLegAnkle','RigRBLegAnkle'];
    const points=names.map(name=>winner.joint.get(name)).filter(Boolean);
    if(!points.length)return;
    winner.model.updateMatrixWorld(true);
    const v=new THREE.Vector3();
    for(let pass=0;pass<5;pass++){
      filmCamera.updateMatrixWorld(true);
      let required=1;
      for(const joint of points){
        joint.getWorldPosition(v);
        const projected=v.clone().project(filmCamera);
        if(!Number.isFinite(projected.x)||!Number.isFinite(projected.y))continue;
        required=Math.max(required,
          Math.abs(projected.x)/.78,Math.abs(projected.y)/.76);
      }
      if(required<=1.0001)break;
      // Keep the shot's low/reverse/high azimuth; only dolly outward.
      const factor=Math.min(1.85,required*1.09);
      filmCamera.position.sub(cameraLook).multiplyScalar(factor).add(cameraLook);
      filmCamera.lookAt(cameraLook);
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
      winner.victoryGesture(sequence.elapsed-start,Boolean(sequence.roarPlayed));
    }else if(winner?.id==='moose'&&sequence.finished){
      const start=cinematics.duration(sequence.event,nativeLength(sequence.event)).victoryStart;
      if(sequence.elapsed>=start)winner.mooseVictory(sequence.elapsed-start);
    }else if(winner?.swim&&sequence.finished){
      const start=cinematics.duration(sequence.event,nativeLength(sequence.event)).victoryStart;
      if(sequence.elapsed>=start)winner.sharkVictory(sequence.elapsed-start);
    }
    applyBlocking();
    // The finishing actor has already received native FBX and additive
    // howl joints at this point. Ground those final posed hind feet now.
    if(winner?.id==='bear'&&sequence.finished)winner.groundHindFeet();
    applyCamera(dt);
    paintSolo(time);
    paintEffects();
    paintFocusLight();
    const event=sequence?.event;
    // The imported Forestfall cutscene owns the screen while open.
    // Keep underlying actor timelines ticking to their completed combat
    // states but avoid competing GPU draws with the live 3D match-cut.
    if(!forestfallOverlayOpen)
      renderer.render(scene,filmCamera||camera);
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
    const ids=(s.animals||[]).map(a=>a?.id).filter(Boolean);
    if(renderer||ids.every(id=>core.BUNDLED?.[id]))
      for(const id of ids)if(core.BUNDLED?.[id]&&!loaded[id])ensureBundled(id);
    if(renderer&&layer){
      if(battlefield!==stage){stage=battlefield;stage.append(layer);fitStage();}
      let changed=force;
      for(let i=0;i<2;i++){
        const id=s.animals[i]?.id;
        if(actors[i]?.id!==id||(!actors[i]&&loaded[id])){
          actors[i]?.destroy();actors[i]=loaded[id]?makeActor(id,i):null;changed=true;
        }
        if(actors[i]){const f=finishFor(i,id);if(actors[i].finish!==f){applyFinish(actors[i],f);changed=true;}}
      }
      const nodes=battlefield.querySelectorAll('.combat-fighter[data-animal-id]');
      nodes.forEach((node,i)=>{
        if(actors[i])node.dataset['3dVisible']='true';
        else node.removeAttribute('data-3d-visible');
      });
      layer.hidden=!actors.some(Boolean);
      if(changed)warmed=false;
      prewarm();
      const hit=bearReview?.active?bearReview.event:core.battleEvent(s);
      if(!hit){if(shownEvent||changed){
        sequence=null;shownEvent=null;actors.forEach(actor=>actor?.idle());
      }}else if(changed||shownEvent!==hit.key){
        shownEvent=hit.key;beginEvent(hit);
      }
      startLoop();
    }
  }
  // A face close-up of each animal from its live rig, for the FOCUS!! strip.
  const portraits={};
  function snapPortrait(actor){
    if(!actor?.model||portraits[actor.id]||!renderer)return;
    const head=actor.joint?.get('RigHead');if(!head)return;
    const canvas=renderer.domElement,W=canvas.width,H=canvas.height;if(!W||!H)return;
    const sc=cinematics.SOLO_SCALE?.[actor.id]||1,f=actor.slot===1?-1:1;
    actor.model.updateMatrixWorld(true);
    const h=head.getWorldPosition(new THREE.Vector3());
    const cam=new THREE.PerspectiveCamera(26,W/H,.05,200);
    if(actor.swim&&actor.joint.get('RigJaw')){
      // shark: its head bone rides the top of a long snout, so frame the
      // face (eye to jaw) from low 3/4 front, tight like the Bear's portrait
      const face=h.clone().lerp(actor.joint.get('RigJaw').getWorldPosition(new THREE.Vector3()),.2);
      cam.position.set(face.x+f*1.05,face.y+.14,face.z+.85);cam.lookAt(face.x-f*.15,face.y-.06,face.z);
    }else{
      cam.position.set(h.x+f*1.7*sc,h.y+.12*sc,h.z+1.0*sc);cam.lookAt(h.x+f*.15*sc,h.y-.05*sc,h.z);
    }
    const others=actors.filter(a=>a&&a!==actor),was=others.map(a=>a.pivot.visible);
    others.forEach(a=>{a.pivot.visible=false;});
    renderer.render(scene,cam);
    const out=document.createElement('canvas');out.width=280;out.height=200;
    const cw=Math.min(W,H*1.4),ch=cw/1.4;
    out.getContext('2d').drawImage(canvas,(W-cw)/2,(H-ch)/2,cw,ch,0,0,280,200);
    others.forEach((a,i)=>{a.pivot.visible=was[i];});
    try{portraits[actor.id]=out.toDataURL('image/jpeg',.85);}catch{}
  }
  let warmed=false;
  function prewarm(){
    if(warmed||!renderer||!scene||!actors[0]?.model||!actors[1]?.model)return;
    warmed=true;
    const step=(f)=>{try{f();}catch(err){console.warn('[arena3d] prewarm step skipped',err);}};
    try{
      const cam=filmCamera||camera,fake={glint:1,impact:1,ring:1,contact:0,fire:1,launch:null};
      step(()=>{for(const a of actors)a.setAura?.(0,0,0);});
      step(()=>paintGlint(fake,actors[0],0));step(()=>paintImpact(fake,actors[1]));
      step(()=>paintLaunchShadow({launch:{landed:false,y:1,drift:0,u:.5}},actors[1]));
      step(()=>{
        if(!fireVoid){fireVoid=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({
          transparent:true,opacity:0,depthWrite:true,fog:false}));scene.add(fireVoid);}
        const tex=backdropTex.fire||(backdropTex.fire=makeBackdropTexture('fire'));
        fireVoid.material.map=tex;fireVoid.material.needsUpdate=true;
      });
      step(()=>{setStage(1,'red');setStage(1,'cosmic');});
      const hidden=[];scene.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true;}});
      renderer.compile(scene,cam);
      for(const o of hidden)o.visible=false;
      setStage(0,'red');
      for(const o of [glint,impactStar,impactRing,blob,fireVoid])if(o)o.visible=false;
      step(()=>{for(const a of actors)snapPortrait(a);});
    }catch(err){console.warn('[arena3d] prewarm skipped',err);}
  }
  // Bundled models (the shark) load themselves: once a 3D arena exists (the
  // player imported a pack) or when every fighter in the duel is bundled.
  const bundling={};
  async function ensureBundled(id){
    if(loaded[id]||bundling[id]||!core.BUNDLED?.[id]||!loader.loadBundled)return;
    bundling[id]=true;
    try{
      const result=await loader.loadBundled(id,status);
      loaded[id]=result;
      await createScene();
      status(label(id)+' ready (bundled model, CC BY 4.0 Mateus Schwaab).');
      const el=panel?.querySelector('[data-ark3d-loaded="'+id+'"]');if(el)el.textContent='READY · BUNDLED';
      syncScene(true);
      window.dispatchEvent(new CustomEvent('arkade:forestfall-assetschange'));
    }catch(error){
      console.warn('[arena3d] bundled',id,'failed',error);status('Could not load the bundled '+id+' model: '+error.message);
    }finally{bundling[id]=false;}
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
      const roarInfo=id==='bear'?
        (result.clips.roar?' Native roar FBX detected.':
        ' No native roar FBX detected; facial animation depends on the rig.'):
        '';
      status(label(id)+' loaded with '+result.bones+' bones and '+Object.keys(result.clips).length+
        ' native motions.'+roarInfo+' Enter a duel to see 3D movement.');
      if(panel){
        const el=panel.querySelector('[data-ark3d-loaded="'+id+'"]');
        if(el)el.textContent='3D MODEL + MOTIONS READY';
      }
      shownEvent=null;syncScene(true);
      window.dispatchEvent(new CustomEvent('arkade:forestfall-assetschange'));
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
    window.dispatchEvent(new CustomEvent('arkade:forestfall-assetschange'));
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
    if(event.target.closest('[data-bear-review-howl]')){replayBearHowl();return;}
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
  window.addEventListener('arkade:forestfallopen',()=>{
    forestfallOverlayOpen=true;
  });
  window.addEventListener('arkade:forestfallclose',()=>{
    forestfallOverlayOpen=false;
    startLoop();
  });
  window.addEventListener('arkade:screenchange',()=>syncScene());
  window.addEventListener('resize',fitStage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLoop();else startLoop();});
  window.addEventListener('pagehide',()=>{
    stopBearReview(false);
    stopLoop();clearActors();for(const id of ['bear','moose','shark'])loaded[id]?.dispose();
    fxGeometry?.dispose();fxMaterials.forEach(m=>m.dispose());fxMaterials=[];
    shockGeometry?.dispose();shockMaterial?.dispose();
    shockRing=null;shockGeometry=null;shockMaterial=null;
    fxParticles=[];fxGroup=null;
    renderer?.dispose();renderer=null;clearCanvas();
  },{once:true});
  // A separate, short real-FBX contact scene for Forestfall. It renders
  // two *clones* of the locally imported skinned models inside the video's
  // 16:9 viewport. It never reuses/mutates the scored arena actors or combat
  // state. Missing private assets simply retain the original video fallback.
  const forestfallCore=window.NoahsForestfallCollisionCore;
  function forestfallCanStage(event){
    return Boolean(forestfallCore?.supports(event,{
      bear:!!loaded.bear,moose:!!loaded.moose,shark:!!loaded.shark,
      webgl:!!THREE&&!!renderer&&!loading
    })&&screen()==='BATTLE_PLAY'&&!bearReview?.active);
  }
  function createForestfallCollision({host,event}={}){
    if(!host||!forestfallCanStage(event))return null;
    let impactRenderer=null,finished=false;
    const disposable=[];
    try{
      const world=new THREE.Scene();
      const backdrop=new THREE.Color(0x193625);
      world.fog=new THREE.Fog(0x193625,11,35);
      world.add(new THREE.HemisphereLight(0xf4e4cb,0x35463a,2));
      const sun=new THREE.DirectionalLight(0xffd6a4,3.1);
      sun.position.set(-3,8,5);world.add(sun);
      const rim=new THREE.DirectionalLight(0x9bbbae,.95);
      rim.position.set(4,3,-4);world.add(rim);
      const ground=new THREE.Mesh(
        new THREE.PlaneGeometry(50,50),
        new THREE.MeshStandardMaterial({color:0x38533b,roughness:1,
          metalness:0,side:THREE.DoubleSide}));
      ground.rotation.x=-Math.PI/2;
      ground.position.y=-.025;
      ground.receiveShadow=true;
      // Same PS2-era forest as the fight, so the match-cut stays in one world.
      const forestRoot=window.NoahsForestArena?.build(THREE,world,{shadows:false});
      if(forestRoot){
        forestRoot.traverse(o=>{if(o.geometry)disposable.push(o.geometry);
          if(o.material){disposable.push(o.material);if(o.material.map)disposable.push(o.material.map);}});
      }else world.add(ground);
      disposable.push(ground.geometry,ground.material);
      const dust=new THREE.Mesh(
        new THREE.RingGeometry(.75,1.05,48),
        new THREE.MeshBasicMaterial({color:0xe9d1a4,transparent:true,
          opacity:0,depthWrite:false,side:THREE.DoubleSide}));
      dust.rotation.x=-Math.PI/2;dust.position.y=.035;
      world.add(dust);disposable.push(dust.geometry,dust.material);
      // Widen the real contact lens enough to fit the airborne Bear's
      // head, both paws and Moose antlers in the same 16:9 frame.
      const camera3d=new THREE.PerspectiveCamera(39,16/9,.1,60);
      const slotDirection=event.attacker===0?1:-1;
      const stageActor=(id,slot)=>{
        const source=loaded[id];
        const model=source.clone(source.model);
        const pivot=new THREE.Group(),orient=new THREE.Group();
        pivot.add(orient);orient.add(model);world.add(pivot);
        const bounds=new THREE.Box3().setFromObject(model);
        const size=bounds.getSize(new THREE.Vector3());
        if(!Number.isFinite(size.y)||size.y<=0)
          throw Error('Invalid private '+id+' model bounds');
        const scale=Math.min(2.52/size.y,2.9/Math.max(.001,size.x),
          2.9/Math.max(.001,size.z));
        model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
        const fitted=new THREE.Box3().setFromObject(model);
        const center=fitted.getCenter(new THREE.Vector3());
        model.position.set(-center.x,-fitted.min.y,-center.z);
        const restX=model.position.x,restZ=model.position.z;
        orient.rotation.y=(slot===0?Math.PI/2:-Math.PI/2)+yaw[id];
        const roots=[];
        model.traverse(node=>{
          if(node.isBone&&/^RigRoot$/i.test(node.name))
            roots.push({node,x:node.position.x,z:node.position.z});
        });
        const mixer=new THREE.AnimationMixer(model);
        let current=null,currentKey=null;
        return {
          pivot,orient,model,
          play(key){
            const clip=source.clips[key]||source.clips.idle;
            if(!clip||currentKey===key)return;
            mixer.stopAllAction();
            const action=mixer.clipAction(clip,model);
            action.reset();action.enabled=true;action.setEffectiveWeight(1);
            action.setLoop(key==='idle'?THREE.LoopRepeat:THREE.LoopOnce,
              key==='idle'?Infinity:1);
            action.clampWhenFinished=true;action.play();
            current=action;currentKey=key;
          },
          sample(time){
            mixer.setTime(Math.max(0,time));
            model.position.x=restX;model.position.z=restZ;
            for(const root of roots){
              root.node.position.x=root.x;root.node.position.z=root.z;
            }
          },
          destroy(){mixer.stopAllAction();world.remove(pivot);}
        };
      };
      const bear=stageActor('bear',event.attacker);
      const moose=stageActor('moose',event.defender);
      bear.play('S');moose.play('idle');
      const groundY=.0;
      impactRenderer=new THREE.WebGLRenderer({alpha:true,antialias:false,
        powerPreference:'low-power'});
      impactRenderer.setClearColor(backdrop,.07);
      impactRenderer.outputColorSpace=THREE.SRGBColorSpace;
      impactRenderer.toneMapping=THREE.ACESFilmicToneMapping;
      impactRenderer.toneMappingExposure=1.12;
      impactRenderer.setPixelRatio(Math.min(1.35,window.devicePixelRatio||1));
      impactRenderer.domElement.setAttribute('aria-hidden','true');
      impactRenderer.domElement.dataset.forestfallFbx='bear-moose';
      host.append(impactRenderer.domElement);
      let width=0,height=0,collided=false;
      const update=(time,duration)=>{
        if(finished)return false;
        const pose=forestfallCore.at(time,duration);
        if(!pose.live)return false;
        const w=Math.max(2,host.clientWidth||960),
          h=Math.max(2,host.clientHeight||540);
        if(w!==width||h!==height){
          width=w;height=h;
          impactRenderer.setSize(width,height,false);
          camera3d.aspect=width/height;camera3d.updateProjectionMatrix();
        }
        const sign=slotDirection;
        bear.pivot.position.set(sign*pose.bearX,groundY+pose.bearY,-.08);
        bear.orient.rotation.z=sign*pose.bearLean;
        moose.pivot.position.set(sign*pose.mooseX,groundY,.02);
        moose.orient.rotation.z=sign*pose.mooseLean;
        const t=pose.movieTime;
        bear.sample(t-forestfallCore.ENTER);
        if(pose.contact&&!collided){
          collided=true;
          // This is a real source animation on the imported Moose FBX,
          // triggered at the source video landing. KO selects Death,
          // otherwise Hit_Stand_L01. No HP changes occur in this scene.
          moose.play(event.knockout?'knockout':'hit');
        }
        moose.sample(pose.contact?t-forestfallCore.CONTACT:t-forestfallCore.ENTER);
        dust.visible=pose.contact&&pose.dust>.001;
        dust.position.x=sign*.50;
        dust.scale.setScalar(.8+pose.dust*2.4);
        dust.material.opacity=.43*pose.dust;
        const cameraHit=pose.contact?
          Math.sin((t-forestfallCore.CONTACT)*51)*
          Math.max(0,1-(t-forestfallCore.CONTACT)/.27)*.05:0;
        camera3d.position.set(sign*(2.7-.45*pose.approach)+cameraHit,
          3.1-.30*pose.approach,9.8-.45*pose.approach);
        camera3d.lookAt(sign*.13,1.35,0);
        impactRenderer.render(world,camera3d);
        return true;
      };
      const stop=()=>{
        if(finished)return;
        finished=true;bear.destroy();moose.destroy();
        impactRenderer?.domElement.remove();
        for(const resource of disposable)resource.dispose();
        world.clear();
        impactRenderer?.forceContextLoss?.();
        impactRenderer?.dispose();
        impactRenderer=null;
      };
      return Object.freeze({update,stop,mode:'native-bear-moose-fbx'});
    }catch(error){
      impactRenderer?.domElement.remove();
      impactRenderer?.forceContextLoss?.();
      impactRenderer?.dispose();
      disposable.forEach(resource=>resource.dispose());
      // Never make local video playback contingent on WebGL success.
      status('Forestfall 3D contact unavailable: '+(error?.message||String(error))+
        '. The original video fallback remains playable.');
      return null;
    }
  }

  window.NoahsArena3D=Object.freeze({
    openPanel,forestfallCanStage,createForestfallCollision,
    startBearReview,
    stopBearReview,
    getReviewState:()=>bearReview?{
      active:bearReview.active,event:bearReview.event,elapsed:sequence?.elapsed||0,
      done:bearReview.done,index:bearReview.index,countdown:bearReview.countdown
    }:null,
    getClipDuration:(index,move)=>nativeLength({attacker:index,move}),
    // Where the victim is on screen (0–1), so the damage number pops on it.
    getHitAnchor:()=>{
      if(!sequence||!filmCamera)return null;
      const d=actors[sequence.event.defender];if(!d)return null;
      const c=d.joint?.get('RigSpine2')||d.joint?.get('RigChest');
      const v=c?c.getWorldPosition(new THREE.Vector3()):d.pivot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1,0));
      v.project(filmCamera);return {x:(v.x+1)/2,y:(1-v.y)/2};
    },
    getPopAnchor:()=>{
      if(!sequence||!filmCamera)return null;
      const d=actors[sequence.event.defender];if(!d)return null;
      const v=d.pivot.getWorldPosition(new THREE.Vector3());v.y+=1.7*(cinematics.SOLO_SCALE?.[d.id]||1);
      v.project(filmCamera);return {x:(v.x+1)/2,y:(1-v.y)/2};
    },
    getPortrait:(id)=>portraits[id]||null,
    // The live 3D film clock, so the DOM overlay and the rigs share one time.
    getSequence:()=>sequence&&renderer&&!document.hidden?{key:sequence.event.key,elapsed:sequence.elapsed}:null,
    // Diagnostic only: materials/programs of an actor (debugging renders).
    getMaterialDebug:(index=0)=>{
      const a=actors[index];if(!a)return null;const out=[];
      a.model.traverse(o=>{if(!o.isMesh)return;
        out.push({name:o.name,vis:o.visible,culled:o.frustumCulled,
          mats:[].concat(o.material).map(m=>({type:m.type,name:m.name,vis:m.visible,op:m.opacity,tr:m.transparent,side:m.side,
            prog:renderer?.properties.get(m)?.currentProgram?.name||null}))});});
      const progs=(renderer?.info.programs||[]).filter(p=>p.diagnostics&&!p.diagnostics.runnable).map(p=>({used:p.usedTimes,frag:p.diagnostics.fragmentShader?.log,vert:p.diagnostics.vertexShader?.log,key:String(p.cacheKey).slice(0,300)}));
      return {meshes:out,progs};
    },
    // Diagnostic only: which clip each live actor is playing.
    getClips:()=>actors.map(actor=>actor?{id:actor.id,key:actor.currentKey,
      pos:actor.pivot.position.toArray().map(n=>+n.toFixed(2)),rot:actor.pivot.rotation.toArray().slice(0,3).map(n=>+(+n).toFixed(2)),
      vis:actor.pivot.visible,
      files:actor.asset?.motionFiles||null,keys:Object.keys(actor.asset?.clips||{})}:null),
    // Diagnostic only: world-space X extent of each live skeleton (no mesh data).
    getReach:()=>actors.map(actor=>{
      if(!actor?.joint?.size||!THREE)return null;
      const v=new THREE.Vector3();let min=Infinity,max=-Infinity,lead=null;
      actor.model.updateMatrixWorld(true);
      for(const [name,bone] of actor.joint){bone.getWorldPosition(v);
        if(v.x<min)min=v.x;if(v.x>max)max=v.x;}
      return {id:actor.id,pivotX:actor.pivot.position.x,min,max};
    }),
    getStatus:()=>({bear:Boolean(loaded.bear),moose:Boolean(loaded.moose),shark:Boolean(loaded.shark),
      sceneReady:Boolean(renderer),active:actors.filter(Boolean).length,
      // The private FBX may not have a jaw bone or mouth morph. Expose
      // only the detected capability, not the private model data itself.
      bearHowlFace:actors.find(actor=>actor?.id==='bear')?.howlCapabilities||null,
      panelOpen:Boolean(panel),loading})
  });
})();
