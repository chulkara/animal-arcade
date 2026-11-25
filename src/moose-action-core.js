/* Moose Motion Lab: original, rig-additive action staging, not supplied animations.
 * Native Cervid Idle/Run/Jump/Hit/Death remain independently playable.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsMooseActionCore=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const FIELDS=Object.freeze(['travel','lateral','lift','pitch','yaw','roll','headPitch','headYaw','neck','chest','leftHoof','rightHoof','tail','pelvis','leftHindHip','rightHindHip','leftHindKnee','rightHindKnee','leftHindHock','rightHindHock','leftHindAnkle','rightHindAnkle','hindPlant','leftFrontKnee','rightFrontKnee']);
const ZERO=Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,0])));
const key=(ms,pose={})=>Object.freeze({ms,...ZERO,...pose});
const MOVES=Object.freeze({
 Guts:Object.freeze({label:'Antler charge',base:'Run',frames:Object.freeze([
  key(0),key(240,{travel:-.24,lift:-.03,pitch:.15,headPitch:.26,neck:.16}),
  key(640,{travel:.56,lift:.03,pitch:.1,headPitch:.25,neck:.13,chest:.06}),
  key(840,{travel:.87,lift:-.02,pitch:.2,headPitch:.4,neck:.27,chest:.08}),
  key(1110,{travel:.52,pitch:.04,headPitch:.06}),key(1450)
 ])}),
 Technique:Object.freeze({label:'Cross-antler sweep',base:'Idle',frames:Object.freeze([
  key(0),key(210,{lateral:-.11,yaw:-.16,headYaw:-.35,roll:-.07}),
  key(420,{lateral:-.3,travel:.1,yaw:-.42,headYaw:-.78,roll:-.1,neck:.1}),
  key(710,{lateral:.13,travel:.36,yaw:.42,headYaw:.88,roll:.14,chest:.16}),
  key(970,{lateral:.16,travel:.29,yaw:.12,headYaw:.22,roll:.03}),
  key(1300)
 ])}),
 Power:Object.freeze({label:'Weight-shift + hind-leg-driven two-hoof stomp',base:'Breathing',frames:Object.freeze([
  // Compression: all four legs participate; stifles/hocks fold, pelvis sinks.
  key(0),
  key(170,{travel:-.05,lift:-.075,pitch:.06,pelvis:.08,
    leftHindHip:-.18,rightHindHip:-.16,leftHindKnee:.27,rightHindKnee:.25,
    leftHindHock:-.12,rightHindHock:-.11,leftHoof:.08,rightHoof:.06,hindPlant:.85}),
  key(390,{travel:-.12,lift:-.16,pitch:.12,pelvis:.18,
    leftHindHip:-.34,rightHindHip:-.31,leftHindKnee:.63,rightHindKnee:.60,
    leftHindHock:-.33,rightHindHock:-.30,leftHindAnkle:.09,rightHindAnkle:.08,
    leftHoof:.37,rightHoof:.34,hindPlant:1}),
  // Hind-leg-driven push into rear-up.
  key(640,{travel:-.07,lift:.085,pitch:-.24,pelvis:-.11,
    leftHindHip:.30,rightHindHip:.34,leftHindKnee:-.17,rightHindKnee:-.19,
    leftHindHock:.11,rightHindHock:.10,leftHindAnkle:-.07,rightHindAnkle:-.06,
    leftHoof:.91,rightHoof:.86,hindPlant:1}),
  key(850,{travel:-.03,lift:.27,pitch:-.42,pelvis:-.18,
    leftHindHip:.43,rightHindHip:.40,leftHindKnee:-.31,rightHindKnee:-.30,
    leftHindHock:.19,rightHindHock:.17,leftHindAnkle:-.11,rightHindAnkle:-.10,
    leftHoof:1.13,rightHoof:1.07,hindPlant:1}),
  // Lower and absorb the landing with bent rear knees, not locked legs.
  key(1040,{travel:.17,lift:.09,pitch:-.09,pelvis:.04,
    leftHindHip:-.11,rightHindHip:-.10,leftHindKnee:.25,rightHindKnee:.22,
    leftHindHock:-.10,rightHindHock:-.09,
    leftHoof:.64,rightHoof:.57,hindPlant:.80}),
  key(1220,{travel:.31,lift:-.055,pitch:.24,pelvis:.16,
    leftHindHip:-.30,rightHindHip:-.28,leftHindKnee:.55,rightHindKnee:.51,
    leftHindHock:-.28,rightHindHock:-.26,leftHindAnkle:.09,rightHindAnkle:.08,
    leftHoof:-.10,rightHoof:-.09,headPitch:.22,neck:.08,hindPlant:.70}),
  key(1440,{travel:.16,lift:-.07,pitch:.055,pelvis:.10,
    leftHindHip:-.14,rightHindHip:-.13,leftHindKnee:.25,rightHindKnee:.23,
    leftHindHock:-.10,rightHindHock:-.09,hindPlant:.50}),
  key(1840)
 ])}),
 // A real leap, not a statue rising: forelegs fold up under the chest in
 // the air and the head/antlers drive down at the target as it comes in.
 Special:Object.freeze({label:'Leaping antler drive',base:'Jump',frames:Object.freeze([
  key(0),key(270,{travel:-.14,lift:-.12,pitch:.15,headPitch:.14,leftHoof:-.12,rightHoof:-.1}),
  key(680,{travel:.21,lift:.32,pitch:-.04,headPitch:.12,neck:.04,leftHoof:.62,rightHoof:.56,leftFrontKnee:.9,rightFrontKnee:.84}),
  key(1050,{travel:.67,lift:.72,pitch:.12,headPitch:.38,neck:.18,chest:.06,leftHoof:.78,rightHoof:.72,leftFrontKnee:1.1,rightFrontKnee:1.04}),
  key(1330,{travel:.95,lift:.31,pitch:.24,headPitch:.46,neck:.22,leftHoof:.3,rightHoof:.26,leftFrontKnee:.35,rightFrontKnee:.3}),
  key(1540,{travel:1.0,lift:.01,pitch:.12,headPitch:.28}),
  key(1880,{travel:.53,headPitch:.03}),key(2280)
 ])})
});
function slope(frames,index,field){
 if(index<=0||index>=frames.length-1)return 0;
 const a=frames[index-1],b=frames[index],c=frames[index+1];
 const d0=(b[field]-a[field])/(b.ms-a.ms),d1=(c[field]-b[field])/(c.ms-b.ms);
 if(d0*d1<=0)return 0;
 const h0=b.ms-a.ms,h1=c.ms-b.ms;
 return (3*(h0+h1))/((2*h1+h0)/d0+(h1+2*h0)/d1);
}
function sampleMove(name,ms,{reducedMotion=false}={}){
 if(!Object.hasOwn(MOVES,name))throw new RangeError('Unknown moose move: '+name);
 if(!Number.isFinite(ms)||ms<0)throw new TypeError('Bad timestamp');
 const move=MOVES[name],frames=move.frames,duration=frames.at(-1).ms;
 const elapsed=Math.min(duration,ms);
 if(reducedMotion)return {name,base:'Idle',complete:elapsed===duration,duration,pose:{...ZERO}};
 let i=0;while(i+1<frames.length-1&&frames[i+1].ms<=elapsed)i++;
 const a=frames[i],b=frames[Math.min(i+1,frames.length-1)];
 const width=b.ms-a.ms,t=width===0?1:(elapsed-a.ms)/width;
 const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t;
 const h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
 const pose={};
 for(const field of FIELDS){
  const value=h00*a[field]+h10*width*slope(frames,i,field)+h01*b[field]+h11*width*slope(frames,i+1,field);
  pose[field]=Math.max(Math.min(a[field],b[field]),Math.min(Math.max(a[field],b[field]),value));
 }
 return {name,base:move.base,complete:elapsed===duration,duration,pose};
}
return Object.freeze({FIELDS,MOVES,sampleMove});
});