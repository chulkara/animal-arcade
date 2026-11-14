/* Moose Motion Lab: original, rig-additive action staging, not supplied animations.
 * Native Cervid Idle/Run/Jump/Hit/Death remain independently playable.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsMooseActionCore=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const FIELDS=Object.freeze(['travel','lateral','lift','pitch','yaw','roll','headPitch','headYaw','neck','chest','leftHoof','rightHoof','tail']);
const ZERO=Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,0])));
const key=(ms,pose={})=>Object.freeze({ms,...ZERO,...pose});
const MOVES=Object.freeze({
 Guts:Object.freeze({label:'Antler charge',base:'Run',frames:Object.freeze([
  key(0),key(240,{travel:-.15,pitch:.09,headPitch:.16,neck:.11}),
  key(640,{travel:.56,lift:.03,pitch:.1,headPitch:.25,neck:.13,chest:.06}),
  key(840,{travel:.87,lift:0,pitch:.17,headPitch:.31,neck:.20}),
  key(1110,{travel:.52,pitch:.04,headPitch:.06}),key(1450)
 ])}),
 Technique:Object.freeze({label:'Cross-antler sweep',base:'Idle',frames:Object.freeze([
  key(0),key(210,{lateral:-.11,yaw:-.16,headYaw:-.35,roll:-.07}),
  key(420,{lateral:-.24,travel:.15,yaw:-.32,headYaw:-.60,neck:.08}),
  key(710,{lateral:.11,travel:.36,yaw:.33,headYaw:.73,roll:.1,chest:.14}),
  key(970,{lateral:.16,travel:.29,yaw:.12,headYaw:.22,roll:.03}),
  key(1300)
 ])}),
 Power:Object.freeze({label:'Two-hoof stomp',base:'Breathing',frames:Object.freeze([
  key(0),key(290,{travel:-.14,lift:-.08,pitch:-.08,leftHoof:.23,rightHoof:.23}),
  key(650,{lift:.30,pitch:-.25,leftHoof:.98,rightHoof:.98,neck:-.07}),
  key(850,{lift:.34,pitch:-.18,leftHoof:1.18,rightHoof:1.18}),
  key(1090,{travel:.34,lift:0,pitch:.19,leftHoof:-.13,rightHoof:-.13,headPitch:.14}),
  key(1390,{travel:.15,pitch:.05}),key(1740)
 ])}),
 Special:Object.freeze({label:'Leaping antler drive',base:'Jump',frames:Object.freeze([
  key(0),key(270,{travel:-.14,lift:-.12,pitch:.15,headPitch:.14}),
  key(680,{travel:.21,lift:.32,pitch:-.10,headPitch:-.06,neck:-.08}),
  key(1050,{travel:.67,lift:.72,pitch:-.13,headPitch:.21,neck:.12}),
  key(1330,{travel:.95,lift:.31,pitch:.17,headPitch:.31,neck:.15}),
  key(1540,{travel:1.0,lift:.01,pitch:.12,headPitch:.24}),
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