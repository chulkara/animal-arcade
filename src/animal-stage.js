/* Bear + Moose local 3D battle stage. Public build is fully playable with
 * original SVG portraits; private FBX/PNG source assets are loaded ON DEVICE.
 * Native Bear attacks and Moose V2 hind-leg-driven procedural Power are reused.
 */
(function(){
'use strict';
const game=document.getElementById('game');
const roster=window.NoahsRoster, bearCore=window.NoahsBearMotionCore;
const mooseCore=window.NoahsMooseAssetsCore,mooseMoves=window.NoahsMooseActionCore;
if(!game||!roster||!bearCore||!mooseCore||!mooseMoves)return;
const SOURCE={
 bear:{root:'./assets/private-3d/bear/',base:'Bear Animated.fbx',
  coat:{body:'Bear Body 2.png',head:'Bear Head 2.png',teeth:'Bear Teef.png'}},
 moose:{root:'./assets/private-3d/moose/',base:'Moose Animated.fbx',
  coat:{body:'Moose Body Warm.png',head:'Moose Head Warm.png',antlers:'Moose Horn.png'}}
};
const NATIVE={
 bear:{idle:'idle',G:'guts',T:'technique',P:'power',special:'special',
  hit:'hit',ko:'knockout',victory:'victory'},
 moose:{idle:'Idle',G:'Run',T:'Idle',P:'Breathing',special:'Jump',
  hit:'Hit',ko:'Knockout',victory:'Victory'}
};
const boneNames={
 head:'RigHead',neck:'RigNeck1',chest:'RigChest',leftHoof:'RigLFLeg1',
 rightHoof:'RigRFLeg1',tail:'RigTail1',pelvis:'RigPelvis',
 leftHindHip:'RigLBLeg1',rightHindHip:'RigRBLeg1',
 leftHindKnee:'RigLBLeg2',rightHindKnee:'RigRBLeg2',
 leftHindHock:'RigLBLeg3',rightHindHock:'RigRBLeg3',
 leftHindAnkle:'RigLBLegAnkle',rightHindAnkle:'RigRBLegAnkle'
};
let three=null,loader=null,layer=null,modal=null,actors=[],raf=0,lastTime=0;
let inBattle=false,lastEventKey='',autoChecked=false;
const sources={bear:null,moose:null},files={bear:null,moose:null};
const status={bear:'Not loaded',moose:'Not loaded'};
const objectUrls=[];
const sizeLimit=95*1024*1024;
const screen=()=>window.__arkade?.getScreen();
const state=()=>window.NoahsCombat?.getState();
const reduced=()=>Boolean(window.__arkade?.getSettings?.()?.reducedMotion)||
 window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
function say(kind,msg){status[kind]=msg;const node=modal?.querySelector('[data-ark-3d-status="'+kind+'"]');if(node)node.textContent=msg;}
async function dependencies(){
 if(three)return three;
 const [THREE,{FBXLoader},{clone}]=await Promise.all([
  import('three'),import('three/addons/loaders/FBXLoader.js'),
  import('three/addons/utils/SkeletonUtils.js')
 ]);
 three={THREE,clone};loader=new FBXLoader();return three;
}
function sourceUrl(kind,filename){
 const local=files[kind]?.get(filename.split('/').at(-1).toLowerCase());
 if(local){
  const url=URL.createObjectURL(local);
  objectUrls.push(url);
  return url;
 }
 return SOURCE[kind].root+(filename.includes('/')?filename.split('/').map(encodeURIComponent).join('/'):encodeURIComponent(filename));
}
function originalFile(kind,filename){
 const f=files[kind]?.get(filename.toLowerCase());return Boolean(f);
}
async function loadTextures(kind){
 const {THREE}=three,loaderTex=new THREE.TextureLoader();
 const out={};
 for(const [role,filename] of Object.entries(SOURCE[kind].coat)){
  if(files[kind]&&!originalFile(kind,filename))throw Error('Missing '+filename+' in selected folder');
  const tex=await loaderTex.loadAsync(sourceUrl(kind,filename));
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.needsUpdate=true;out[role]=tex;
 }
 return out;
}
function role(kind,node,mat,index){
 if(kind==='bear')return window.NoahsBearMaterialCore?.materialRole(mat?.name,index)||
  ['body','head','teeth'][index]||'body';
 return mooseCore.roleFor(node.name,mat?.name,index);
}
async function loadKind(kind,inputFiles=null){
 if(!Object.hasOwn(SOURCE,kind))return;
 say(kind,'Loading local '+kind+' model and native textures…');
 if(inputFiles){
  const list=Array.from(inputFiles);
  if(!list.length||list.length>80||list.some(f=>f.size>sizeLimit)){
   say(kind,'Choose the extracted motion-lab folder (up to 80 files, each under 95 MB).');return;
  }
  const entries=new Map();
  for(const f of list){
   // One animal folder is selected per input; collisions are rejected.
   const key=f.name.toLowerCase();
   if(entries.has(key)){say(kind,'Duplicate filenames in folder. Choose one '+kind+' folder.');return;}
   entries.set(key,f);
  }
  if(!entries.has(SOURCE[kind].base.toLowerCase())){
   say(kind,'Cannot find '+SOURCE[kind].base+'. Select the folder that contains assets/'+kind+'/');return;
  }
  files[kind]=entries;
 }
 const required=SOURCE[kind].base;
 try{
  await dependencies();
  const url=sourceUrl(kind,required);
  const base=await loader.loadAsync(url);
  const tex=await loadTextures(kind);
  let skinned=0;
  base.traverse(node=>{
   if(!node.isMesh)return;
   if(node.isSkinnedMesh)skinned++;
   const previous=Array.isArray(node.material)?node.material:[node.material];
   const replacement=previous.map((m,i)=>{
    const key=role(kind,node,m,i);
    return new three.THREE.MeshStandardMaterial({name:kind+'_'+key,map:tex[key]||tex.body,
     color:0xffffff,roughness:.91,metalness:0,side:three.THREE.FrontSide});
   });
   node.material=Array.isArray(node.material)?replacement:replacement[0];
   node.frustumCulled=false;
  });
  if(!skinned)throw Error('No skinned '+kind+' model found');
  const dims=new three.THREE.Box3().setFromObject(base);
  const size=dims.getSize(new three.THREE.Vector3());
  if(!Number.isFinite(size.length())||size.length()<.0001)throw Error('Invalid model dimensions');
  sources[kind]={base,bounds:dims,clips:new Map(),textures:tex};
  disposeActors();lastEventKey='';
  say(kind,'Ready: original '+kind+' FBX and brown textures loaded on this device.');
  sync();
 }catch(e){
  say(kind,'Unable to load: '+(e?.message||e)+'. Illustrated fallback remains playable.');
  console.warn('Local 3D source unavailable',kind,e);
 }
}
function spec(kind,name){
 if(kind==='bear')return bearCore.CLIPS[name];
 const file=mooseCore.CLIPS[name];
 return file?{file,loop:!['Hit','Knockout','Jump'].includes(name),hold:name==='Knockout'}:null;
}
async function getClip(kind,name){
 const source=sources[kind];const info=spec(kind,name);
 if(!source||!info)throw Error('Missing native '+kind+' animation '+name);
 if(!source.clips.has(name)){
  source.clips.set(name,(async()=>{
   if(files[kind]&&!originalFile(kind,info.file))throw Error('Missing '+info.file);
   const fbx=await loader.loadAsync(sourceUrl(kind,'Animations/'+info.file));
   if(!fbx.animations?.[0]?.tracks?.length)throw Error('Empty '+name+' animation');
   const clip=fbx.animations[0];clip.name=kind+'-'+name;return clip;
  })());
 }
 try{return await source.clips.get(name);}catch(e){source.clips.delete(name);throw e;}
}
function initLayer(){
 if(layer)return;
 layer=document.createElement('div');layer.className='ark-animal-3d-layers';
 layer.setAttribute('aria-hidden','true');game.append(layer);
}
function createActor(kind,slot){
 const {THREE,clone}=three,source=sources[kind];
 initLayer();
 const host=document.createElement('div');host.className='ark-animal-3d-slot';
 host.dataset.slot=String(slot);
 const canvas=document.createElement('canvas');host.append(canvas);layer.append(host);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.3));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.35;
 const scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xffe8ca,0x23403e,2.35));
 const key=new THREE.DirectionalLight(0xffe5ca,3.05);key.position.set(-4,9,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xc5d9ed,1.25);fill.position.set(4,4,-6);scene.add(fill);
 const camera=new THREE.PerspectiveCamera(36,1,.03,150);
 const stage=new THREE.Group();scene.add(stage);
 const base=clone(source.base);
 const bounds=new THREE.Box3().setFromObject(base);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const scale=(kind==='bear'?4.0:4.7)/Math.max(size.x,size.y,size.z);
 const align=new THREE.Group();align.position.set(-center.x,-bounds.min.y,-center.z);align.add(base);
 const sized=new THREE.Group();sized.scale.setScalar(scale);sized.add(align);stage.add(sized);
 const mixer=new THREE.AnimationMixer(base);
 const bones=Object.fromEntries(Object.entries(boneNames).map(([k,n])=>[k,base.getObjectByName(n)]));
 const previous=new Map(), twist=new THREE.Quaternion(),axes={
  X:new THREE.Vector3(1,0,0),Y:new THREE.Vector3(0,1,0),Z:new THREE.Vector3(0,0,1)
 };
 let action=null,mode='idle',serial=0,disposed=false,cue=null,afterAction=null;
 let lastW=0,lastH=0,groundY=null;
 function resetBones(){
  for(const [bone,q] of previous)bone.quaternion.copy(q);
  previous.clear();
  stage.position.set(0,0,0);stage.rotation.set(0,0,0);
 }
 function twistBone(name,axis,angle){
  const bone=bones[name];if(!bone||Math.abs(angle)<.00001)return;
  if(!previous.has(bone))previous.set(bone,bone.quaternion.clone());
  bone.quaternion.multiply(twist.setFromAxisAngle(axes[axis],angle));
 }
 function hindGround(){
  if(!bones.leftHindAnkle||!bones.rightHindAnkle)return null;
  stage.updateWorldMatrix(true,true);
  const l=new THREE.Vector3(),r=new THREE.Vector3();
  bones.leftHindAnkle.getWorldPosition(l);bones.rightHindAnkle.getWorldPosition(r);
  return (l.y+r.y)/2;
 }
 function additive(p){
  stage.position.set(p.lateral||0,p.lift||0,p.travel||0);
  stage.rotation.set(p.pitch||0,p.yaw||0,p.roll||0);
  for(const [field,axis] of [['headPitch','X'],['headYaw','Y']])twistBone('head',axis,p[field]||0);
  twistBone('neck','X',p.neck||0);twistBone('chest','Y',p.chest||0);
  for(const side of ['left','right'])twistBone(side+'Hoof','X',p[side+'Hoof']||0);
  twistBone('tail','Y',p.tail||0);twistBone('pelvis','X',p.pelvis||0);
  for(const side of ['left','right']){
   for(const part of ['HindHip','HindKnee','HindHock','HindAnkle'])
    twistBone(side+part,'X',p[side+part]||0);
  }
  if(cue?.name==='Power'&&groundY!==null&&(p.hindPlant||0)>.001){
   const current=hindGround();
   if(current!==null)stage.position.y+=THREE.MathUtils.clamp(groundY-current,-.18,.18)*(p.hindPlant||0);
  }
 }
 async function native(name){
  const ticket=++serial;mode=name;
  try{
   const clip=await getClip(kind,name);
   if(disposed||ticket!==serial)return false;
   const next=mixer.clipAction(clip),old=action,info=spec(kind,name);
   if(next===old)next.stop();
   next.enabled=true;next.reset().setEffectiveWeight(1).play();
   next.setLoop(info.loop?THREE.LoopRepeat:THREE.LoopOnce,info.loop?Infinity:1);
   next.clampWhenFinished=!info.loop;
   if(old&&old!==next)next.crossFadeFrom(old,.18,false);
   action=next;return true;
  }catch(e){if(!disposed&&ticket===serial)say(kind,'Clip '+name+': '+e.message+'. Portrait fallback remains available.');return false;}
 }
 mixer.addEventListener('finished',e=>{
  if(e.action!==action||disposed||cue)return;
  if(mode==='knockout'||mode==='Knockout')return;
  const follow=afterAction;afterAction=null;
  if(follow)perform('victory');else native(NATIVE[kind].idle);
 });
 function perform(kindAction,opts={}){
  cue=null;afterAction=null;groundY=null;
  if(kindAction==='attack'){
   const name=opts.special?'special':opts.technique||'G';
   if(kind==='bear'){
    afterAction=opts.victory?'victory':null;
    native(NATIVE.bear[name]);return;
   }
   const move=name==='special'?'Special':{G:'Guts',T:'Technique',P:'Power'}[name];
   if(!move)return;
   const currentCue={name:move,elapsed:0,ready:false,victory:Boolean(opts.victory)};
   cue=currentCue;
   native(NATIVE.moose[name]).then(ok=>{if(cue===currentCue)currentCue.ready=ok;});
   return;
  }
  if(kindAction==='hurt'){native(NATIVE[kind].hit);return;}
  if(kindAction==='ko'){native(NATIVE[kind].ko);return;}
  if(kindAction==='victory'){native(NATIVE[kind].victory);return;}
  native(NATIVE[kind].idle);
 }
 function tick(dt,time){
  resetBones();
  mixer.update(dt);
  if(cue?.ready){
   if(cue.name==='Power'&&groundY===null)groundY=hindGround();
   cue.elapsed+=dt*1000;
   const snapshot=mooseMoves.sampleMove(cue.name,cue.elapsed,{reducedMotion:reduced()});
   additive(snapshot.pose);
   if(snapshot.complete){
    const was=cue;cue=null;groundY=null;
    if(was.victory)perform('victory');
    else native(NATIVE[kind].idle);
   }
  }
  renderer.render(scene,camera);
 }
 function layout(rect,outer){
  if(!rect||rect.width<1||rect.height<1){host.hidden=true;return;}
  host.hidden=false;host.style.left=rect.left-outer.left+'px';host.style.top=rect.top-outer.top+'px';
  host.style.width=rect.width+'px';host.style.height=rect.height+'px';
  const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
  if(w!==lastW||h!==lastH){
   lastW=w;lastH=h;renderer.setSize(w,h,false);
   camera.aspect=w/h;
   const distance=Math.max(8,5.2/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(.65,camera.aspect)));
   camera.position.set(distance*.60,distance*.27,distance*.79);
   camera.lookAt(0,kind==='moose'?1.45:1.30,0);camera.updateProjectionMatrix();
  }
 }
 native(NATIVE[kind].idle);
 return {kind,slot,host,perform,layout,tick,dispose(){
  disposed=true;serial++;mixer.stopAllAction();renderer.dispose();host.remove();
 }};
}
function disposeActors(){
 for(const a of actors)a.dispose();
 actors=[];document.querySelectorAll('.ark-animal-3d-live').forEach(el=>el.classList.remove('ark-animal-3d-live'));
 if(layer){layer.remove();layer=null;}
 if(raf){cancelAnimationFrame(raf);raf=0;}
}
function sync(){
 const active=screen()==='BATTLE_PLAY';const was=inBattle;inBattle=active;
 if(!active){if(was)disposeActors();lastEventKey='';if(modal)closePanel();return;}
 if(!three){attemptAuto();return;}
 const fighters=[...document.querySelectorAll('.combat-fighter[data-fighter-slot]')];
 const ready=fighters.map(f=>({slot:Number(f.dataset.fighterSlot),kind:f.dataset.fighterId,el:f}))
  .filter(f=>sources[f.kind]);
 if(ready.length!==actors.length||ready.some(f=>!actors.find(a=>a.slot===f.slot&&a.kind===f.kind))){
  disposeActors();lastEventKey='';
  for(const f of ready){try{actors.push(createActor(f.kind,f.slot));}catch(e){say(f.kind,'3D unavailable: '+e.message);}}
 }
 if(layer)layer.hidden=false;
 for(const f of fighters){
  const actor=actors.find(a=>a.slot===Number(f.dataset.fighterSlot)&&a.kind===f.dataset.fighterId);
  f.classList.toggle('ark-animal-3d-live',Boolean(actor));
 }
 const s=state(),e=s?.lastEvent;
 if(e?.kind==='HIT'){
  const k=[s.session.bout,s.round,e.attacker,e.defender,e.damage,e.remainingHp].join(':');
  if(k!==lastEventKey){
   lastEventKey=k;
   actors.find(a=>a.slot===e.attacker)?.perform('attack',{technique:e.technique,
    special:Boolean(e.special),victory:s.phase==='FINISHED'&&s.winner===e.attacker});
   actors.find(a=>a.slot===e.defender)?.perform(s.animals[e.defender].hp<=0?'ko':'hurt');
  }
 }else if(!e&&lastEventKey){
  lastEventKey='';actors.forEach(a=>a.perform('idle'));
 }
 if(!raf){lastTime=performance.now();raf=requestAnimationFrame(draw);}
}
function draw(t){
 raf=0;
 if(!inBattle||document.hidden)return;
 const dt=Math.max(0,Math.min((t-lastTime)/1000,.05));lastTime=t;
 const outer=game.getBoundingClientRect();
 const fighters=[...document.querySelectorAll('.combat-fighter[data-fighter-slot]')];
 for(const actor of actors){
  const fighter=fighters.find(f=>Number(f.dataset.fighterSlot)===actor.slot&&f.dataset.fighterId===actor.kind);
  if(!fighter){actor.host.hidden=true;continue;}
  const image=fighter.querySelector('.combat-fighter-art');
  actor.layout((image||fighter).getBoundingClientRect(),outer);actor.tick(dt,t);
 }
 raf=requestAnimationFrame(draw);
}
async function attemptAuto(){
 if(autoChecked||!inBattle)return;
 autoChecked=true;
 for(const kind of roster.IDS){
  try{
   const response=await fetch(SOURCE[kind].root+encodeURIComponent(SOURCE[kind].base),{method:'HEAD',cache:'no-store'});
   if(response.ok)await loadKind(kind);
  }catch{/* Public build intentionally contains no unlicensed 3D binaries. */}
 }
}
function openPanel(){
 if(screen()!=='BATTLE_PLAY')return;
 if(modal){modal.querySelector('input')?.focus();return;}
 modal=document.createElement('section');modal.className='ark-3d-panel';
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.setAttribute('aria-label','Local Bear and Moose 3D models');
 modal.innerHTML='<header><h2>3D ANIMAL MODELS</h2><button type="button" data-ark-3d-close aria-label="Close 3D models">✕</button></header>'+
 '<p>The playable roster is <b>Bear + Moose</b>. Your approved native FBX animation packs remain on this computer. Choose each extracted Motion Lab folder to see those models in live battles. Nothing is uploaded or saved to a server.</p>'+
 '<label>BEAR MODEL FOLDER<input type="file" data-ark-3d-folder="bear" webkitdirectory directory multiple></label>'+
 '<p data-ark-3d-status="bear">'+status.bear+'</p>'+
 '<label>MOOSE MODEL FOLDER<input type="file" data-ark-3d-folder="moose" webkitdirectory directory multiple></label>'+
 '<p data-ark-3d-status="moose">'+status.moose+'</p>'+
 '<p class="ark-3d-note">Choose the extracted folder containing <code>assets/bear/</code> or <code>assets/moose/</code>. You can also install the files under <code>assets/private-3d/{animal}/</code> for automatic local loading. The original fallback art remains visible until a model is ready. Source licenses still need verification before publishing the FBXs.</p>';
 game.append(modal);modal.querySelector('input')?.focus();
}
function closePanel(){modal?.remove();modal=null;}
game.addEventListener('click',event=>{
 if(event.target.closest('[data-ark-3d-open]')){openPanel();return;}
 if(event.target.closest('[data-ark-3d-close]')){closePanel();return;}
});
game.addEventListener('change',event=>{
 const input=event.target.closest('[data-ark-3d-folder]');
 if(input)loadKind(input.dataset.ark3dFolder,input.files);
});
window.addEventListener('keydown',event=>{
 if(!modal||event.key!=='Escape')return;
 event.preventDefault();event.stopImmediatePropagation();closePanel();
},true);
window.addEventListener('arkade:screenchange',sync);
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&inBattle&&!raf){lastTime=performance.now();raf=requestAnimationFrame(draw);}
});
window.addEventListener('beforeunload',()=>{
 disposeActors();for(const url of objectUrls)URL.revokeObjectURL(url);
});
window.NoahsAnimalStage=Object.freeze({openPanel,getStatus:()=>({...status})});
})();
