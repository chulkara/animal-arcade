/* Deterministic, non-scoring Bear cinematic review.
 * Three reviewed native attacks followed by the Power knockout victory edit.
 * Never writes HP, match history, inventory or live game outcomes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.NoahsBearReviewCore=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MOVES=Object.freeze(['G','T','P']);
 const LABELS=Object.freeze({G:'GUTS · FERAL CHARGE',T:'TECHNIQUE · LOW SWIPE',P:'POWER · HIGH PAW STRIKE + VICTORY'});
 function events(state){
   const animals=state?.animals;
   if(!Array.isArray(animals)||animals.length!==2)throw new RangeError('Choose a two-animal battle first');
   const attacker=animals.findIndex(a=>a?.id==='bear');
   if(attacker<0)throw new RangeError('Select Brown Bear as one of the battle animals');
   const defender=1-attacker;
   if(!['bear','moose'].includes(animals[defender]?.id))throw new RangeError('Unknown opponent');
   return Object.freeze(MOVES.map((move,index)=>Object.freeze({
     key:'bear-review:'+attacker+':'+index,
     review:true,attacker,defender,attackerId:'bear',
     defenderId:animals[defender].id,move,technique:move,
     special:false,miracleName:null,miracleBonus:0,
     damage:0,remainingHp:animals[defender].hp,
     finished:index===2,knockout:index===2
   })));
 }
 function label(index){
   if(!Number.isInteger(index)||index<0||index>=MOVES.length)throw new RangeError('Unknown Bear review step');
   return LABELS[MOVES[index]];
 }
 return Object.freeze({MOVES,LABELS,events,label});
});
