/* Great White Shark: original procedural attack staging layered on the
 * bundled model's own clips (Swim, SwimFast, Bite1, Bite2, Hit). The model is
 * CC-BY 4.0 by Mateus Schwaab; every key below is this game's own motion.
 *
 * The shark fights in the forest arena, swimming ~0.9 m above the floor.
 * Each move scrubs one of its clips (clipTime, seconds) so the jaws open and
 * snap exactly on the authored beats, and adds whole-body staging:
 *   travel  m forward along its facing     lift  m up (on top of the hover)
 *   pitch   rad, + nose up                 yaw   rad, + turn to its own left
 *   roll    rad about its length           bend  rad, S-curve through the body
 *   tail    rad, extra tail-fin whip       jaw   0..1 extra jaw opening
 *   headYaw rad                            clipTime  s into the move's clip
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsSharkActionCore=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const FIELDS=Object.freeze(['travel','lift','pitch','yaw','roll','bend','tail','jaw','headYaw','clipTime']);
const ZERO=Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,0])));
const key=(ms,pose={})=>Object.freeze({ms,...ZERO,...pose});
const TAU=Math.PI*2;
// Height of the shark's belly above the forest floor, and its idle bob.
const HOVER=.9,BOB=.06,BOB_HZ=.32;
// clip: which of the model's clips the move scrubs (loaded under these keys).
const MOVES=Object.freeze({
 // Coils back with the jaws gaping, then rams forward and snaps shut.
 Guts:Object.freeze({label:'Ramming bite',clip:'bite1',contact:840,frames:Object.freeze([
  key(0),
  key(300,{travel:-.16,pitch:-.05,bend:.22,tail:.28,clipTime:.22}),
  key(640,{travel:-.24,pitch:.10,bend:-.18,tail:-.2,jaw:.2,clipTime:.42}),
  key(840,{travel:.55,pitch:-.05,bend:.05,tail:-.42,clipTime:.62}),
  key(1060,{travel:.46,pitch:-.02,tail:.15,clipTime:.80}),
  key(1450,{clipTime:1.04})
 ])}),
 // Spins on the spot so the tail leads, and whips the caudal fin through the
 // victim, then completes the turn back to facing it.
 Technique:Object.freeze({label:'Tail lash',clip:'swimFast',contact:700,frames:Object.freeze([
  key(0),
  key(330,{yaw:1.25,roll:-.18,bend:.55,tail:.45,travel:.05,clipTime:.30}),
  key(580,{yaw:2.70,roll:-.10,bend:.75,tail:.95,travel:.18,clipTime:.60}),
  key(700,{yaw:3.30,roll:.16,bend:-.85,tail:-1.15,travel:.26,clipTime:.75}),
  key(960,{yaw:4.70,roll:.08,bend:-.30,tail:-.35,travel:.18,clipTime:1.10}),
  key(1300,{yaw:TAU,clipTime:1.56})
 ])}),
 // Dives to the floor, breaches nose-up with the jaws wide, then crashes down
 // jaws-first onto the victim.
 Power:Object.freeze({label:'Breach strike',clip:'bite2',contact:1250,frames:Object.freeze([
  key(0),
  key(380,{lift:-.55,pitch:-.36,bend:.18,tail:.3,clipTime:.05}),
  key(800,{lift:1.05,pitch:.95,travel:.18,tail:-.4,jaw:.15,clipTime:.55}),
  key(1050,{lift:1.5,pitch:.55,travel:.42,tail:.3,jaw:.2,clipTime:.66}),
  key(1250,{lift:.5,pitch:-.55,travel:.68,tail:-.25,clipTime:.84}),
  key(1500,{lift:.08,pitch:-.14,travel:.48,clipTime:1.0}),
  key(1850,{clipTime:1.25})
 ])}),
 // Thrashes and snaps twice, then bites down and death-rolls a full turn
 // about its own length.
 Special:Object.freeze({label:'Deep-sea frenzy',clip:'bite1',contact:1400,frames:Object.freeze([
  key(0),
  key(300,{travel:-.14,yaw:.34,bend:.42,tail:.4,clipTime:.30}),
  key(600,{travel:-.10,yaw:-.34,bend:-.42,tail:-.4,jaw:.3,headYaw:.2,clipTime:.42}),
  key(900,{travel:.24,yaw:.28,bend:.30,tail:.3,headYaw:-.15,clipTime:.62}),
  key(1150,{travel:.08,yaw:-.18,bend:-.2,jaw:.4,clipTime:.42}),
  key(1400,{travel:.60,pitch:-.06,tail:-.3,clipTime:.62}),
  key(1850,{travel:.50,roll:TAU,bend:.2,tail:.35,clipTime:.70}),
  key(2300,{roll:TAU,clipTime:1.04})
 ])})
});
const CODE=Object.freeze({G:'Guts',T:'Technique',P:'Power',S:'Special'});
const LENGTH=Object.freeze(Object.fromEntries(Object.entries(CODE).map(([m,c])=>[m,MOVES[c].frames.at(-1).ms])));
const CONTACT=Object.freeze(Object.fromEntries(Object.entries(CODE).map(([m,c])=>[m,MOVES[c].contact])));
function slope(frames,i,field){
 if(i<=0||i>=frames.length-1)return 0;
 const a=frames[i-1],b=frames[i+1],c=frames[i];
 const d1=c[field]-a[field],d2=b[field]-c[field];
 if(d1*d2<=0)return 0; // a turning point holds still: no overshoot
 return (b[field]-a[field])/Math.max(1,b.ms-a.ms);
}
function sampleMove(name,ms,{reducedMotion=false}={}){
 if(!Object.hasOwn(MOVES,name))throw new RangeError('Unknown shark move: '+name);
 if(!Number.isFinite(ms)||ms<0)throw new TypeError('Bad timestamp');
 const move=MOVES[name],frames=move.frames,duration=frames.at(-1).ms;
 const elapsed=Math.min(duration,ms);
 if(reducedMotion)return {name,clip:move.clip,complete:elapsed===duration,duration,pose:{...ZERO}};
 let i=0;while(i+1<frames.length-1&&frames[i+1].ms<=elapsed)i++;
 const a=frames[i],b=frames[Math.min(i+1,frames.length-1)];
 const width=b.ms-a.ms,t=width===0?1:(elapsed-a.ms)/width;
 const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
 const pose={};
 for(const field of FIELDS){
  const value=h00*a[field]+h10*width*slope(frames,i,field)+h01*b[field]+h11*width*slope(frames,i+1,field);
  pose[field]=Math.max(Math.min(a[field],b[field]),Math.min(Math.max(a[field],b[field]),value));
 }
 return {name,clip:move.clip,complete:elapsed===duration,duration,pose};
}
// Idle hover: belly height above the floor (m) at time t (ms).
function hover(t,{reducedMotion=false}={}){
 if(reducedMotion||!Number.isFinite(t))return HOVER;
 return HOVER+BOB*Math.sin(t/1000*TAU*BOB_HZ);
}
// Knockout (no clip of its own): rolls belly-up and sinks to the floor.
// p 0..1 along the fall; the get-up plays it backwards.
function knockout(p){
 const u=Math.max(0,Math.min(1,p)),e=u*u*(3-2*u);
 return {roll:2.6*e,sink:Math.min(1,e*1.15),bend:.35*Math.sin(Math.PI*u)};
}
return Object.freeze({FIELDS,MOVES,CODE,LENGTH,CONTACT,HOVER,BOB,sampleMove,hover,knockout});
});
