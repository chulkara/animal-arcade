/* Static inventory from user's Moose 1.0 / Cervid Animations archive.
 * No third-party FBX or texture bytes are checked into the repository.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsMooseAssetsCore=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const CLIPS=Object.freeze({
 Idle:'Stand_Idle_01.FBX',Breathing:'Stand_Breathing_01.FBX',
 Walk:'Loco_Walk.FBX',Trot:'Loco_Trot.FBX',Run:'Loco_Run.FBX',
 Sprint:'Loco_Sprint.FBX',Sneak:'Loco_Sneak.FBX',
 Jump:'JumpStand.FBX',Hit:'Hit_Stand_L01.FBX',
 Knockout:'Death_Stand_R01.FBX',Victory:'Stand_Idle_02.FBX',
 TurnLeft:'Trans_TurnL.FBX',TurnRight:'Trans_TurnR.FBX',
 RunTransition:'Trans_Stand_to_Run.FBX',
 TrotTransition:'Trans_Stand_to_Trot.FBX',
 LookLeft:'Add_Look_Left.FBX',LookRight:'Add_Look_Right.FBX',
 LookDown:'Add_Look_Down.FBX',Eating:'Stand_Eating_01.FBX'
});
const COATS=Object.freeze({
 brown:Object.freeze({body:'Moose Body Warm.png',head:'Moose Head Warm.png',antlers:'Moose Horn.png'}),
 original:Object.freeze({body:'Moose Body.png',head:'Moose Head.png',antlers:'Moose Horn.png'}),
 white:Object.freeze({body:'White Moose Body.png',head:'White Moose Head.png',antlers:'Moose Horn.png'})
});
const ROLES=Object.freeze(['body','head','antlers']);
function roleFor(meshName,materialName,index){
 const m=String(materialName||'').toLowerCase(),mesh=String(meshName||'').toLowerCase();
 if(/chifre|horn|antler/.test(m+' '+mesh))return 'antlers';
 if(/head/.test(m))return 'head';
 if(/body/.test(m))return 'body';
 if(!Number.isInteger(index)||index<0)throw new RangeError('Bad moose material index');
 return index===0?'head':'body';
}
function fileFor(id){
 if(!Object.hasOwn(CLIPS,id))throw new RangeError('Unknown native Moose animation');
 return CLIPS[id];
}
function textureFor(role,coat='brown'){
 if(!ROLES.includes(role)||!Object.hasOwn(COATS,coat))throw new RangeError('Invalid Moose texture role/coat');
 return COATS[coat][role];
}
return Object.freeze({CLIPS,COATS,ROLES,roleFor,fileFor,textureFor});
});