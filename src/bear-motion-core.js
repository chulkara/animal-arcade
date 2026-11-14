/* Native bear 1.0 motion map. The pack supplies separate FBXs on one
 * matching RigRoot skeleton; asset files remain local while licensing is unknown.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsBearMotionCore=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const CLIPS=Object.freeze({
    idle:{file:'Stand_Idle_01.FBX',loop:true,kind:'stance'},
    breathing:{file:'Stand_Breathing_01.FBX',loop:true,kind:'stance'},
    walk:{file:'Loco_Walk.FBX',loop:true,kind:'locomotion'},
    run:{file:'Loco_Run.FBX',loop:true,kind:'locomotion'},
    sprint:{file:'Loco_Sprint.FBX',loop:true,kind:'locomotion'},
    angry:{file:'StandAngry_Breathing_01.FBX',loop:true,kind:'stance'},
    guts:{file:'Attack_Run_01_AttackF.FBX',loop:false,kind:'attack'},
    technique:{file:'Attack_StandAngry_01_Low.FBX',loop:false,kind:'attack'},
    power:{file:'Attack_StandAngry_01_High.FBX',loop:false,kind:'attack'},
    special:{file:'Attack_StandAngry_02_High.FBX',loop:false,kind:'attack'},
    hit:{file:'Hit_Stand_F01.FBX',loop:false,kind:'reaction'},
    knockout:{file:'Death_Stand_R01.FBX',loop:false,kind:'defeat',hold:true},
    victory:{file:'StandHind_Idle_01.FBX',loop:true,kind:'celebration'},
    rear:{file:'Trans_Stand_to_StandHind.FBX',loop:false,kind:'transition'},
    chargeTurn:{file:'Attack_Run_01_Turn.FBX',loop:false,kind:'transition'},
    runTransition:{file:'Trans_Stand_to_Run.FBX',loop:false,kind:'transition'}
  });
  const ids=Object.freeze(Object.keys(CLIPS));
  function getClip(id){
    if(typeof id!=='string'||!Object.hasOwn(CLIPS,id))
      throw new RangeError('Unknown bear motion: '+String(id));
    return CLIPS[id];
  }
  // Simple deterministic director. Loop clips persist. One-shots return to
  // native Idle except KO, which holds final pose. Out-of-order completion
  // notifications do not reset a newer motion.
  function createDirector(){
    let sequence=0,current='idle';
    const select=(id)=>{
      const clip=getClip(id);
      sequence++;
      current=id;
      return {id,clip,sequence,returnTo:clip.loop||clip.hold?null:'idle'};
    };
    return {
      select,
      complete(sequenceId){
        if(sequenceId!==sequence)return null;
        const clip=getClip(current);
        if(clip.loop||clip.hold)return null;
        return select('idle');
      },
      reset:()=>select('idle'),
      get:()=>({id:current,sequence,clip:getClip(current)})
    };
  }
  return Object.freeze({CLIPS,ids,getClip,createDirector});
});
