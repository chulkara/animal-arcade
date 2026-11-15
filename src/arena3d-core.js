/* Noah's Arkade private-asset 3D arena manifest and deterministic event selection.
 * Pure utilities: no source FBX or textures, networking, or filesystem access. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsArena3DCore=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const MAX_FILE=85*1024*1024,MAX_TOTAL=310*1024*1024;
  const REQUIRED=Object.freeze({
    bear:Object.freeze({
      base:'Bear Animated.fbx',
      motions:Object.freeze({
        idle:'Stand_Idle_01.FBX',run:'Loco_Run.FBX',
        G:'Attack_Run_01_AttackF.FBX',T:'Attack_StandAngry_01_Low.FBX',
        P:'Attack_StandAngry_01_High.FBX',S:'Attack_StandAngry_02_High.FBX',
        hit:'Hit_Stand_F01.FBX',knockout:'Death_Stand_R01.FBX',
        victory:'StandHind_Idle_01.FBX'
      }),
      textures:Object.freeze({body:'Bear Body 2.png',head:'Bear Head 2.png',teeth:'Bear Teef.png'})
    }),
    moose:Object.freeze({
      base:'Moose Animated.fbx',
      motions:Object.freeze({
        idle:'Stand_Idle_01.FBX',breathing:'Stand_Breathing_01.FBX',
        run:'Loco_Run.FBX',jump:'JumpStand.FBX',
        hit:'Hit_Stand_L01.FBX',knockout:'Death_Stand_R01.FBX',
        victory:'Stand_Idle_02.FBX'
      }),
      textures:Object.freeze({body:'Moose Body Warm.png',head:'Moose Head Warm.png',antlers:'Moose Horn.png'})
    })
  });
  function basename(path){
    return String(path||'').replace(/\\/g,'/').split('/').pop().trim().toLowerCase();
  }
  function planFiles(id,input){
    const config=REQUIRED[id];
    if(!config)throw new RangeError('Unknown private animal');
    const files=Array.from(input||[]);
    const total=files.reduce((sum,f)=>sum+(Number(f?.size)||0),0);
    if(total>MAX_TOTAL)throw new RangeError('Selected folder exceeds the 310 MB limit');
    const byName=new Map();
    for(const file of files){
      if(!file||!Number.isFinite(file.size)||file.size<0||file.size>MAX_FILE)
        throw new RangeError('Invalid or oversized local asset');
      const name=basename(file.name);
      if(!/\.(fbx|png|jpe?g|webp)$/.test(name))continue;
      if(byName.has(name)){
        // A nested source folder can contain duplicates. Avoid silently
        // choosing the wrong native animation or material variation.
        throw new Error('Duplicate asset name: '+file.name+'; select one extracted model folder');
      }
      byName.set(name,file);
    }
    const model=byName.get(basename(config.base))||null;
    const clips=Object.fromEntries(Object.entries(config.motions).map(
      ([key,name])=>[key,byName.get(basename(name))||null]));
    const textures=Object.fromEntries(Object.entries(config.textures).map(
      ([key,name])=>[key,byName.get(basename(name))||null]));
    const missing=[];
    if(!model)missing.push(config.base);
    for(const [key,file] of Object.entries(clips))if(!file)missing.push(config.motions[key]);
    for(const [key,file] of Object.entries(textures))if(!file)missing.push(config.textures[key]);
    return Object.freeze({id,model,clips,textures,missing,ready:missing.length===0,
      size:total,count:files.length});
  }
  function motionKey(id,technique,special=false){
    if(!Object.hasOwn(REQUIRED,id))throw new RangeError('Unknown animal');
    if(!['G','T','P'].includes(technique))throw new RangeError('Invalid technique');
    return special?'S':technique;
  }
  function battleEvent(s){
    if(!s||!['RESULT','FINISHED'].includes(s.phase)||s.lastEvent?.kind!=='HIT')
      return null;
    const hit=s.lastEvent;
    if(!Number.isInteger(hit.attacker)||![0,1].includes(hit.attacker)||
       !Number.isInteger(hit.defender)||hit.defender===hit.attacker ||
       !['G','T','P'].includes(hit.technique))return null;
    const ids=s.animals?.map(a=>a.id);
    if(!ids||ids.length!==2||ids.some(id=>!Object.hasOwn(REQUIRED,id)))return null;
    return Object.freeze({
      key:[s.session?.bout??1,s.round,hit.attacker,hit.defender,hit.damage,
        hit.technique,hit.special?1:0,hit.remainingHp].join(':'),
      attacker:hit.attacker,defender:hit.defender,
      attackerId:ids[hit.attacker],defenderId:ids[hit.defender],
      move:motionKey(ids[hit.attacker],hit.technique,Boolean(hit.special)),
      technique:hit.technique,special:Boolean(hit.special),
      knockout:s.animals[hit.defender].hp===0,
      finished:s.phase==='FINISHED'
    });
  }
  function contactMs(id,move,durationMs){
    if(!Object.hasOwn(REQUIRED,id))throw new RangeError('Unknown animal');
    if(!['G','T','P','S'].includes(move))throw new RangeError('Invalid move');
    if(id==='moose')return {G:830,T:680,P:1220,S:1330}[move];
    const duration=Number.isFinite(durationMs)&&durationMs>0?durationMs:1050;
    return Math.max(180,Math.min(1400,Math.round(duration*.47)));
  }
  return Object.freeze({REQUIRED,MAX_FILE,MAX_TOTAL,basename,planFiles,motionKey,battleEvent,contactMs});
});
