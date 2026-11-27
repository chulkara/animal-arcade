/* Active roster: Brown Bear, Mountain Moose and Great White Shark.
 * Bear/Moose FBX packs load locally; the shark GLB is bundled (CC-BY 4.0,
 * Mateus Schwaab - see THIRD_PARTY_ASSETS.md). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NoahsRoster=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const ANIMALS=Object.freeze({
 bear:Object.freeze({id:'bear',name:'BROWN BEAR',label:'BROWN BEAR',type:'FOREST GUARDIAN',art:'./assets/bear-placeholder.svg',legend:'Guardian of the old forest.',affinity:'forest',
 moves:Object.freeze({G:'FERAL CHARGE',T:'LOW SWIPE',P:'HIGH PAW STRIKE',S:'RAGING REAR'}),
 native:Object.freeze({idle:'Stand_Idle_01.FBX',run:'Loco_Run.FBX',G:'Attack_Run_01_AttackF.FBX',T:'Attack_StandAngry_01_Low.FBX',P:'Attack_StandAngry_01_High.FBX',S:'Attack_StandAngry_02_High.FBX',hit:'Hit_Stand_F01.FBX',knockout:'Death_Stand_R01.FBX',victory:'StandHind_Idle_01.FBX'})}),
 moose:Object.freeze({id:'moose',name:'MOUNTAIN MOOSE',label:'MOUNTAIN MOOSE',type:'HIGHLAND TITAN',art:'./assets/moose-placeholder.svg',legend:'Thunder of hooves across the highland.',affinity:'highland',
 moves:Object.freeze({G:'ANTLER CHARGE',T:'CROSS-ANTLER SWEEP',P:'TWO-HOOF STOMP',S:'LEAPING ANTLER DRIVE'}),
 native:Object.freeze({idle:'Stand_Idle_01.FBX',run:'Loco_Run.FBX',hit:'Hit_Stand_L01.FBX',knockout:'Death_Stand_R01.FBX',victory:'Stand_Idle_02.FBX'})}),
 // Fights in the same forest arena, swimming ~0.9 m above the floor.
 shark:Object.freeze({id:'shark',name:'GREAT WHITE SHARK',label:'GREAT WHITE',type:'ABYSSAL HUNTER',art:'./assets/shark-placeholder.svg',legend:'It swims through the air as if the forest were the sea.',affinity:'ocean',
 moves:Object.freeze({G:'RAMMING BITE',T:'TAIL LASH',P:'BREACH STRIKE',S:'DEEP-SEA FRENZY'}),
 native:Object.freeze({idle:'Swim',run:'SwimFast',hit:'Hit',knockout:'(procedural)',victory:'Swim'})})
});
const ids=Object.freeze(Object.keys(ANIMALS));
// Solo opponent: Bear and Moose keep their rivalry; the shark hunts the Bear.
const RIVAL=Object.freeze({bear:'moose',moose:'bear',shark:'bear'});
function opponentOf(id){if(!Object.hasOwn(ANIMALS,id))throw new RangeError('Invalid roster animal');return RIVAL[id];}
function motionFor(id,{technique=null,special=false,reaction=null}={}){
 const a=ANIMALS[id];if(!a)throw new RangeError('Invalid roster animal');
 if(reaction){if(!['idle','run','hit','knockout','victory'].includes(reaction))throw new RangeError('Invalid reaction');return {id:reaction,kind:'native',file:a.native[reaction]};}
 if(!['G','T','P'].includes(technique))return {id:'idle',kind:'native',file:a.native.idle};
 const key=special?'S':technique;
 if(id==='bear')return {id:key,kind:'native',file:a.native[key]};
 return {id:key,kind:'procedural',move:{G:'Guts',T:'Technique',P:'Power',S:'Special'}[key]};
}
return Object.freeze({ANIMALS,ids,opponentOf,motionFor});
});