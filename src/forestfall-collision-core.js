/* Deterministic Forestfall hybrid video / real-FBX handoff.
 * Timed from the user's 14.93 s source video, not from a guessed impact
 * percentage. The live FBX scene is visible only during this contact insert.
 * No gameplay damage or HP is calculated here. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsForestfallCollisionCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const SOURCE_SECONDS=14.93;
// At 11.65s the Bear has fallen into the ground-level forest shot;
// at ~11.8s its front paws contact the earth, with dust at ~12.1s.
// A short return to the source movie catches the final Bear roar.
const ENTER=11.53,CONTACT=11.82,DUST=12.06,EXIT=13.22;
function clamp(value,min=0,max=1){return Math.max(min,Math.min(max,value));}
function ease(value){const t=clamp(value);return t*t*(3-2*t);}
function at(time,duration=SOURCE_SECONDS){
 const validDuration=Number.isFinite(duration)&&duration>0?duration:SOURCE_SECONDS;
 const t=Math.max(0,Number(time)||0)*SOURCE_SECONDS/validDuration;
 const approach=ease((t-ENTER)/(CONTACT-ENTER));
 const hit=ease((t-CONTACT)/.55);
 const recoil=ease((t-CONTACT)/.24)*(1-.24*ease((t-12.65)/.55));
 return Object.freeze({
  movieTime:t,phase:t<ENTER?'video':t<CONTACT?'approach':t<EXIT?'collision':'outro',
  live:t>=ENTER&&t<EXIT,
  contact:t>=CONTACT,contactTime:CONTACT,entryTime:ENTER,exitTime:EXIT,
  approach,hit,recoil,
  // Root translations are bounded and derived from source-video time, not
  // accumulated per frame. This also makes video seek/resume deterministic.
  bearX:-1.5+1.34*approach,
  bearY:1.65*(1-approach),
  bearLean:-.25*(1-approach)+.025*hit,
  mooseX:1.01+.75*recoil,
  mooseLean:-.24*recoil,
  dust:clamp((t-DUST)/.25)*(1-ease((t-12.45)/.60))
 });
}
function supports(event,{bear=false,moose=false,webgl=false}={}){
 return Boolean(event&&event.attackerId==='bear'&&event.defenderId==='moose'&&
  [0,1].includes(event.attacker)&&event.defender===1-event.attacker&&
  bear&&moose&&webgl);
}
return Object.freeze({SOURCE_SECONDS,ENTER,CONTACT,DUST,EXIT,at,supports});
});