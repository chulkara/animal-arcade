/* Cinematic combat grammar for Noah's Arkade.
 * Original shot directions, not any third-party game camera data or artwork.
 * Pure and deterministic, so the same animal/technique always gets the same
 * staged sequence regardless of its opponent. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsCinematicCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const TYPES=Object.freeze(['G','T','P','S']);
const POSES=Object.freeze({
  wide:Object.freeze({x:0,y:3.1,z:12.2,targetY:1.18,zoom:1,angle:0}),
  hunter:Object.freeze({x:-1.65,y:2.0,z:8.2,targetY:1.25,zoom:1.23,angle:-.20}),
  ground:Object.freeze({x:-1.2,y:1.10,z:7.7,targetY:1.0,zoom:1.32,angle:-.33}),
  sweep:Object.freeze({x:0,y:3.05,z:8.5,targetY:1.45,zoom:1.27,angle:.19}),
  rush:Object.freeze({x:0,y:1.35,z:8.9,targetY:1.18,zoom:1.09,angle:0}),
  rising:Object.freeze({x:0,y:2.0,z:8.3,targetY:2.08,zoom:1.40,angle:.34}),
  impact:Object.freeze({x:.1,y:1.8,z:8.8,targetY:1.23,zoom:1.15,angle:.06}),
  recoil:Object.freeze({x:1.45,y:2.3,z:8.0,targetY:1.17,zoom:1.33,angle:.12}),
  lowHero:Object.freeze({x:-1.65,y:.95,z:7.3,targetY:1.42,zoom:1.40,angle:-.32}),
  sideHero:Object.freeze({x:-1.5,y:2.1,z:8.5,targetY:1.30,zoom:1.25,angle:.48}),
  highHero:Object.freeze({x:-1.5,y:4.4,z:9.3,targetY:1.30,zoom:1.26,angle:-.18}),
  finale:Object.freeze({x:-.7,y:2.0,z:10.6,targetY:1.3,zoom:1.09,angle:0})
});
const ATTACKS=Object.freeze({
  bear:Object.freeze({
    G:Object.freeze({name:'FERAL CHARGE',shots:['hunter','wide','impact','recoil'],accent:'earth'}),
    T:Object.freeze({name:'LOW SWIPE',shots:['ground','hunter','impact','recoil'],accent:'jade'}),
    P:Object.freeze({name:'HIGH PAW STRIKE',shots:['rising','hunter','impact','recoil'],accent:'ember'}),
    S:Object.freeze({name:'RAGING REAR',shots:['ground','rising','impact','recoil'],accent:'gold'})
  }),
  moose:Object.freeze({
    G:Object.freeze({name:'ANTLER CHARGE',shots:['hunter','wide','impact','recoil'],accent:'earth'}),
    T:Object.freeze({name:'CROSS-ANTLER SWEEP',shots:['sweep','hunter','impact','recoil'],accent:'jade'}),
    P:Object.freeze({name:'TWO-HOOF STOMP',shots:['ground','rising','impact','recoil'],accent:'ember'}),
    S:Object.freeze({name:'LEAPING ANTLER DRIVE',shots:['highHero','rising','impact','recoil'],accent:'gold'})
  })
});
const MIRACLES=Object.freeze({
  'FALLING STAR':Object.freeze({type:'starfall',label:'FALLING STAR',symbol:'✷',accent:'gold'}),
  'DAWN CHORUS':Object.freeze({type:'dawn',label:'DAWN CHORUS',symbol:'☼',accent:'gold'}),
  'STORM BELL':Object.freeze({type:'storm',label:'STORM BELL',symbol:'ϟ',accent:'electric'}),
  'TIDAL WISH':Object.freeze({type:'tide',label:'TIDAL WISH',symbol:'◈',accent:'sea'}),
  'ECLIPSE OATH':Object.freeze({type:'eclipse',label:'ECLIPSE OATH',symbol:'☾',accent:'violet'})
});
// Arcade-style "solo" attacks, from the 2026-11-24 reference footage
// (Brown Bear vs Great Hornbill, 13.8–22.8 s): the two animals never share
// the frame. Title card on the arena stage → white-out → attacker alone,
// crouched head-on → flash cut as it rears → strike (fire void for the
// signature moves) with a claw glint → it lunges into the lens → flash →
// victim already tumbling under a red sky → cut to the arena wide as it
// lands in a dirt plume with its damage number → back to the two-shot.
// strike: 'fire' (burning void), 'charge' (runs at the lens through speed
// streaks) or 'slash' (claw ribbon across the screen).
// launch: 'blast' (blown up and away from the lens, heavy slam + bounce),
// 'skid' (low hit, lands on its side and skids), 'roll' (barrel-rolls away).
// hitStop ms and Dutch tilt (rad) on the impact frame differ per move.
const SOLO_STYLE=Object.freeze({
  G:Object.freeze({rank:'LV.1 GUTS',strike:'charge',launch:'skid',hitStop:100,tilt:0,distance:4.6}),
  T:Object.freeze({rank:'LV.1 TECHNIQUE',strike:'slash',launch:'roll',hitStop:110,tilt:.21,distance:5.2}),
  P:Object.freeze({rank:'LV.2 SIGNATURE',strike:'fire',launch:'blast',hitStop:135,tilt:.31,distance:6.2}),
  S:Object.freeze({rank:'LV.3 SIGNATURE',strike:'fire',launch:'blast',hitStop:135,tilt:.31,distance:6.6})
});
const SOLO=Object.freeze({
  bear:Object.freeze({
    G:Object.freeze({...SOLO_STYLE.G,launchHeight:2.3,spin:.8}),
    T:Object.freeze({...SOLO_STYLE.T,launchHeight:2.4,spin:.9}),
    P:Object.freeze({...SOLO_STYLE.P,launchHeight:2.6,spin:1}),
    S:Object.freeze({...SOLO_STYLE.S,launchHeight:2.9,spin:1.2})
  }),
  moose:Object.freeze({
    G:Object.freeze({...SOLO_STYLE.G,launchHeight:2.2,spin:.8}),
    T:Object.freeze({...SOLO_STYLE.T,launchHeight:2.3,spin:.9}),
    P:Object.freeze({...SOLO_STYLE.P,launchHeight:2.5,spin:1}),
    S:Object.freeze({...SOLO_STYLE.S,launchHeight:2.8,spin:1.2})
  })
});
const LAUNCH_MS=Object.freeze({blast:720,skid:640,roll:700});
// Fights run on small numbers (180 HP); the screen shows them at arcade
// scale. Display only: every rule and outcome is unchanged.
const DISPLAY_SCALE=50;
// Body height relative to the Bear, so framing fits each animal.
const SOLO_SCALE=Object.freeze({bear:1,moose:1.18});
const SOLO_MS=Object.freeze({titleIn:220,lead:2000,whiteOut:380,lunge:170,
  hitStop:110,launchDelay:170,launch:720,land:1500,ret:520,pop:950,koHold:1250,downHold:450,getUp:400});
const reducedShake=v=>Number.isFinite(v)?v:0;
// event.film===false forces the older shared-frame grammar (the fallback for
// animals without a film entry; also how the tests keep covering it).
function soloSpec(event){return event?.film===false?null:SOLO[event?.attackerId]?.[event?.move]||null;}
const length=(event,nativeMs)=>{
  if(event.attackerId==='moose')return {G:1450,T:1300,P:1840,S:2280}[event.move];
  return Number.isFinite(nativeMs)&&nativeMs>100?nativeMs:1450;
};
function spec(id,move){
  const s=ATTACKS[id]?.[move];
  if(!s)throw new RangeError('Unknown cinematic attack: '+id+' '+move);
  return s;
}
function miracle(name){
  return MIRACLES[String(name||'').toUpperCase()]||null;
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*ease(t);
// Contact moments measured from the loaded native clips (the frame where
// the striking paw/head reaches furthest forward). When present they replace
// the ratio guess, so the defender reacts on the frame the blow lands.
const MEASURED={};
function setMeasuredContact(attackerId,move,ms){
  if(!ATTACKS[attackerId]?.[move])return false;
  if(!Number.isFinite(ms)||ms<=0){if(MEASURED[attackerId])delete MEASURED[attackerId][move];return false;}
  (MEASURED[attackerId]||(MEASURED[attackerId]={}))[move]=Math.round(ms);
  return true;
}
// Key poses layered on restaged native strikes: the silhouettes the eye
// should catch at the wind-up and the blow. Radians, added to the source
// clip's bones. Pitch: + = lean back / nose up. Yaw: + = turn toward the
// animal's own left. Shoulders: + = forearm swung forward/up.
// Times are clip ms relative to anchors: 0 (start), w (wind-up end),
// c (contact) and h (end of the impact linger).
const POSE_FIELDS=Object.freeze(['spine1','spine2','chest','neck','head','shoulderL','shoulderR','chestYaw','headYaw','armOutL','armOutR','elbowL','elbowR']);
const KEY_POSES=Object.freeze({
  bear:Object.freeze({
    // Feral Charge: coil low with the head down, then a full-length lunge.
    G:Object.freeze([
      {at:['0',0]},
      {at:['w',-.5],pose:{spine1:-.08,chest:-.08,neck:-.10,head:-.10,shoulderL:-.10,shoulderR:-.10}},
      {at:['w',0],pose:{spine1:-.13,spine2:-.06,chest:-.10,neck:-.16,head:-.16,shoulderL:-.16,shoulderR:-.16}},
      {at:['c',0],pose:{spine1:.05,spine2:.04,chest:.07,neck:.14,head:-.05,shoulderL:.30,shoulderR:.24}},
      {at:['h',0],pose:{spine1:.04,spine2:.03,chest:.05,neck:.10,head:-.03,shoulderL:.22,shoulderR:.18}},
      {at:['h',320]}
    ]),
    // Low Swipe: coil the chest away with the striking paw cocked, then rake across.
    T:Object.freeze([
      {at:['0',0]},
      {at:['w',0],pose:{chestYaw:.30,headYaw:.16,chest:-.05,spine2:-.04,shoulderR:-.12,elbowR:.55}},
      {at:['c',0],pose:{chestYaw:-.28,headYaw:-.20,chest:-.04,shoulderR:.30,elbowR:.30}},
      {at:['h',0],pose:{chestYaw:-.34,headYaw:-.24,chest:-.03,shoulderR:.22,elbowR:.35}},
      {at:['h',360]}
    ]),
    // High Paw Strike: rear taller with both forearms raised, then slam down.
    P:Object.freeze([
      {at:['0',0]},
      {at:['w',-.35],pose:{spine1:.07,spine2:.04,chest:.05,shoulderL:-.10,shoulderR:.16,armOutR:.30}},
      {at:['w',0],pose:{spine1:.14,spine2:.07,chest:.09,neck:.08,head:.06,shoulderL:-.22,shoulderR:.24,armOutR:.62,elbowR:-.25,elbowL:.30}},
      {at:['c',0],pose:{spine1:-.10,spine2:-.06,chest:-.13,neck:-.06,head:-.04,shoulderL:-.05,shoulderR:.12,armOutR:.25}},
      {at:['h',0],pose:{spine1:-.08,spine2:-.05,chest:-.10,neck:-.08,head:-.10}},
      {at:['h',360]}
    ])
  })
});
function keyPose(attackerId,move,clipMs,st){
  const keys=KEY_POSES[attackerId]?.[move];
  const out=Object.fromEntries(POSE_FIELDS.map(f=>[f,0]));
  if(!keys||!st||!Number.isFinite(clipMs))return out;
  const anchor={'0':0,w:st.windupEnd,c:st.contact,h:st.holdEnd};
  const at=k=>{const [a,off]=k.at;return anchor[a]+(Math.abs(off)<1&&off!==0?off*(a==='w'?st.windupEnd:st.contact):off);};
  const times=keys.map(at);
  if(clipMs<=times[0]||clipMs>=times.at(-1))return out;
  let i=0;while(i<times.length-2&&clipMs>=times[i+1])i++;
  const span=Math.max(1,times[i+1]-times[i]),u=Math.max(0,Math.min(1,(clipMs-times[i])/span)),e=u*u*(3-2*u);
  const a=keys[i].pose||{},b=keys[i+1].pose||{};
  for(const f of POSE_FIELDS)out[f]=(a[f]||0)+((b[f]||0)-(a[f]||0))*e;
  return out;
}
function measuredContact(attackerId,move){return MEASURED[attackerId]?.[move];}
// Restaging of native strikes (timing only; the source motion is kept).
// Arcade weight comes from a slow, readable wind-up, a snapped strike, a
// lingering impact and a brisk recovery. Segments are in CLIP time with a
// playback speed; real time follows from them. Only clips listed here change.
const STAGING=Object.freeze({
  bear:Object.freeze({
    G:Object.freeze({windup:.6,windupSpeed:.72,strikeSpeed:1.6,holdMs:140,holdSpeed:.4,recoverSpeed:1.45}),
    // Low Swipe's source clip spends 3 of its 4 s recovering; play that fast.
    T:Object.freeze({windup:.55,windupSpeed:.7,strikeSpeed:1.6,holdMs:150,holdSpeed:.4,recoverSpeed:2.6}),
    P:Object.freeze({windup:.62,windupSpeed:.68,strikeSpeed:1.75,holdMs:170,holdSpeed:.35,recoverSpeed:1.7})
  }),
  // The Moose's attacks are our own keyframes; same arcade shape.
  moose:Object.freeze({
    G:Object.freeze({windup:.35,windupSpeed:.62,strikeSpeed:1.45,holdMs:140,holdSpeed:.4,recoverSpeed:1.5}),
    T:Object.freeze({windup:.6,windupSpeed:.65,strikeSpeed:1.6,holdMs:130,holdSpeed:.4,recoverSpeed:1.5}),
    P:Object.freeze({windup:.7,windupSpeed:.75,strikeSpeed:1.5,holdMs:160,holdSpeed:.35,recoverSpeed:1.5}),
    S:Object.freeze({windup:.4,windupSpeed:.7,strikeSpeed:1.35,holdMs:170,holdSpeed:.35,recoverSpeed:1.5})
  })
});
// Authored contact frames of the Moose's keyframed attacks (clip time).
const MOOSE_CONTACT=Object.freeze({G:830,T:680,P:1220,S:1330});
function staging(attackerId,move,clipContactMs,clipLengthMs){
  const st=STAGING[attackerId]?.[move];
  if(!st||!Number.isFinite(clipContactMs)||!Number.isFinite(clipLengthMs)||
    clipContactMs<=0||clipContactMs>=clipLengthMs)return null;
  const w=clipContactMs*st.windup,c=clipContactMs,h=Math.min(clipLengthMs,c+st.holdMs);
  const segments=Object.freeze([
    Object.freeze({from:0,to:w,speed:st.windupSpeed}),
    Object.freeze({from:w,to:c,speed:st.strikeSpeed}),
    Object.freeze({from:c,to:h,speed:st.holdSpeed}),
    Object.freeze({from:h,to:clipLengthMs,speed:st.recoverSpeed})
  ]);
  const clipAt=realMs=>{let real=0;
    for(const seg of segments){const span=(seg.to-seg.from)/seg.speed;
      if(realMs<=real+span)return seg.from+(realMs-real)*seg.speed;real+=span;}
    return clipLengthMs;};
  const realAt=clipMs=>{let real=0;
    for(const seg of segments){const end=Math.min(seg.to,clipMs);
      if(end>seg.from)real+=(end-seg.from)/seg.speed;if(clipMs<=seg.to)break;}
    return real;};
  const speedAt=clipMs=>(segments.find(seg=>clipMs<seg.to)||segments.at(-1)).speed;
  return Object.freeze({segments,windupEnd:w,contact:c,holdEnd:h,
    realContact:Math.round(realAt(c)),realLength:Math.round(realAt(clipLengthMs)),realAt,clipAt,speedAt});
}
function clearMeasuredContacts(){for(const key of Object.keys(MEASURED))delete MEASURED[key];}
function duration(event,nativeMs){
  if(!ATTACKS[event?.attackerId]?.[event?.move])throw new RangeError('Invalid battle event');
  const measured=MEASURED[event.attackerId]?.[event.move]??
    (event.attackerId==='moose'?MOOSE_CONTACT[event.move]:undefined);
  const staged=Number.isFinite(nativeMs)?staging(event.attackerId,event.move,measured,nativeMs):null;
  if(staged)return timeline(event,staged.realLength,staged.realContact,
    Math.round(staged.realAt(staged.windupEnd)));
  const attack=length(event,nativeMs);
  const contact=event.attackerId==='moose'?MOOSE_CONTACT[event.move]:
    Number.isFinite(measured)&&Number.isFinite(nativeMs)?
      clamp(measured,180,Math.min(attack+180,2400)):
    clamp(Math.round(attack*{G:.58,T:.68,P:.74,S:.69}[event.move]),
      180,Math.min(attack+180,2400));
  return timeline(event,attack,contact,Math.round(contact*.6));
}
function timeline(event,attack,contact,windup){
  const miracleLead=event.miracleName?850:0;
  if(soloSpec(event)){
    const sp=soloSpec(event);
    const actionLead=miracleLead+SOLO_MS.lead;
    const titleIn=miracleLead+SOLO_MS.titleIn;
    windup=clamp(windup,0,contact);
    // Beats inside the strike (ms after actionLead).
    const lungeAt=Math.max(120,contact-SOLO_MS.lunge);
    const fireStart=sp.strike==='fire'?
      clamp(Math.min(windup-120,lungeAt-260),160,lungeAt-80):lungeAt;
    const cutAt=clamp(Math.min(windup*.6,fireStart-240),80,lungeAt-60);
    const launchAt=actionLead+contact+Math.max(SOLO_MS.launchDelay,sp.hitStop+40);
    const landAt=launchAt+(LAUNCH_MS[sp.launch]||SOLO_MS.launch);
    const returnAt=landAt+SOLO_MS.land;
    const finish=returnAt+SOLO_MS.ret;
    const victoryStart=event.finished?landAt+SOLO_MS.koHold:Infinity;
    return Object.freeze({solo:true,strike:sp.strike,launch:sp.launch,hitStop:sp.hitStop,attack,contact,windup,
      cutAt,fireStart,lungeAt,miracleLead,focusLead:SOLO_MS.lead,actionLead,titleIn,
      launchAt,landAt,returnAt,finish,victoryStart,
      total:event.finished?victoryStart+VICTORY_END_MS:finish+480});
  }
  // The reference takes time to prepare a signature move. Our previous
  // edit triggered the native FBX on frame one, so no strike had a buildup.
  const focusLead={G:340,T:380,P:780,S:880}[event.move];
  const actionLead=miracleLead+focusLead;
  const finish=actionLead+Math.max(attack+260,contact+580);
  const victoryStart=event.finished?finish+180:Infinity;
  return Object.freeze({attack,contact,miracleLead,focusLead,actionLead,finish,
    victoryStart,total:event.finished?victoryStart+VICTORY_END_MS:finish+480});
}
function shot(event,elapsed,nativeMs){
  const timing=duration(event,nativeMs);
  const t=clamp(Number(elapsed)||0,0,timing.total);
  const descriptor=spec(event.attackerId,event.move);
  if(t<timing.miracleLead)
    return Object.freeze({name:'miracle',beat:'MIRACLE',shot:'wide',pose:POSES.wide,
      local:t,progress:timing.miracleLead? t/timing.miracleLead:1,timing,
      accent:miracle(event.miracleName)?.accent||'gold'});
  if(timing.solo&&t>=timing.miracleLead&&t<timing.victoryStart){
    const at=t-timing.actionLead;
    const pick=t<timing.titleIn?['FOCUS','clash']:
      t<timing.actionLead?['TITLE','soloTitle']:
      at<timing.cutAt?['ATTACK','soloRise']:
      at<timing.fireStart?['ATTACK','soloRear']:
      at<timing.lungeAt?['ATTACK','soloFire']:
      at<timing.contact?['ATTACK','lunge']:
      t<timing.launchAt?['CONTACT','lunge']:
      t<timing.landAt?['LAUNCH','launch']:
      t<timing.returnAt?['IMPACT','landing']:['REACTION','returnWide'];
    return Object.freeze({name:pick[1],beat:pick[0],shot:pick[1],pose:POSES.wide,
      local:pick[0]==='FOCUS'||pick[0]==='TITLE'?t-timing.miracleLead:at,
      progress:clamp(at/timing.attack,0,1),timing,accent:descriptor.accent,solo:true});
  }
  if(t<timing.actionLead)
    return Object.freeze({name:'focus',beat:'FOCUS',shot:'focus',pose:POSES.hunter,
      local:t-timing.miracleLead,progress:(t-timing.miracleLead)/timing.focusLead,
      timing,accent:descriptor.accent});
  if(event.finished&&t>=timing.victoryStart){
    const v=t-timing.victoryStart;
    const name=victoryShot(v);
    return Object.freeze({name,beat:'VICTORY',shot:name,pose:POSES[name],local:v,
      progress:clamp(v/VICTORY_END_MS,0,1),timing,accent:descriptor.accent});
  }
  const attackTime=t-timing.actionLead,contact=timing.contact;
  let stage,beat;
  if(attackTime<Math.min(contact*.32,340)){stage=0;beat='INTRO';}
  else if(attackTime<contact){stage=1;beat='ATTACK';}
  else if(attackTime<contact+150){stage=2;beat='CONTACT';}
  else {stage=3;beat='REACTION';}
  // A very short fast-moving shot immediately before contact is why the
  // arcade's signature moves feel choreographed. Bear T uses a paw-level
  // sweep instead of the G/P charge tunnel.
  const fast=beat==='ATTACK'&&attackTime/contact>.70;
  const name=fast?(event.move==='T'?'sweep':'rush'):descriptor.shots[stage];
  return Object.freeze({name,beat,shot:name,pose:POSES[name]||POSES.sweep,local:attackTime,
    progress:clamp(attackTime/timing.attack,0,1),timing,accent:descriptor.accent});
}
// Per-frame staging for solo attacks: who is on screen, flashes, aura, fire
// void, claw glint, red sky and the victim's tumble. Pure; the 3D runtime and
// the DOM overlay both read it so they can never drift apart.
function soloView(event,elapsed,nativeMs){
  const timing=duration(event,nativeMs),sp=soloSpec(event);
  const none=Object.freeze({active:false,showAttacker:true,showDefender:true,
    flash:0,aura:0,fire:0,glint:0,burst:0,streak:0,slash:0,redSky:0,lunge:0,
    shake:0,launch:null,pops:0,roar:0,stage:null,strike:null});
  if(!timing.solo||!sp)return none;
  const t=clamp(Number(elapsed)||0,0,timing.total);
  if(t<timing.miracleLead||t>=Math.min(timing.finish,timing.victoryStart))return none;
  const spike=(at,rise,fall)=>t<at?clamp(1-(at-t)/rise,0,1):clamp(1-(t-at)/fall,0,1);
  const A=timing.actionLead,contactAt=A+timing.contact;
  const lungeAt=A+timing.lungeAt,fireAt=A+timing.fireStart;
  // Title starts on a white burst; it fades out to white; a one-frame flash
  // cuts the crouch to the rear-up; the impact flash follows the lunge.
  const whiteOut=t<A-SOLO_MS.whiteOut?0:t<A?ease((t-(A-SOLO_MS.whiteOut))/SOLO_MS.whiteOut):
    clamp(1-(t-A)/160,0,1);
  const flash=Math.max(spike(timing.titleIn,60,300),whiteOut,
    .9*spike(A+timing.cutAt,16,110),spike(contactAt+50,50,timing.launchAt-contactAt+60),
    .35*spike(timing.landAt,16,140));
  const aura=t<timing.titleIn||t>=timing.launchAt?0:ease((t-timing.titleIn)/260);
  const fire=sp.strike!=='fire'||t<fireAt||t>=timing.launchAt?0:ease((t-fireAt)/220);
  const glint=sp.strike==='charge'||t>=contactAt?0:spike(lungeAt-50,240,90);
  const streak=sp.strike==='charge'&&t>=A+timing.cutAt&&t<timing.launchAt?
    ease((t-A-timing.cutAt)/200):0;
  const slash=sp.strike==='slash'?spike(contactAt,90,260):0;
  const lunge=t<lungeAt?0:t<contactAt?ease((t-lungeAt)/Math.max(1,contactAt-lungeAt)):
    t<timing.launchAt?1:0;
  // Hit-stop shake while the rigs are frozen, a smaller bump on landing.
  const hitAge=t-contactAt,landAge=t-timing.landAt;
  const shake=hitAge>=0&&hitAge<320?Math.sin(hitAge*.19)*Math.exp(-hitAge/(sp.hitStop||110)):
    landAge>=0&&landAge<160?.45*Math.sin(landAge*.24)*Math.exp(-landAge/60):0;
  const burst=t<timing.titleIn?0:clamp(1-(t-timing.titleIn)/520,0,1);
  const redSky=t>=timing.launchAt&&t<timing.landAt?1:0;
  const away=event.attacker===0?1:-1;
  // The victim, as in the reference: blown AWAY from the lens, entering the
  // top of the frame already upside-down and dropping into the distance.
  let launch=null;
  if(t>=timing.launchAt&&t<timing.returnAt){
    const L=sp.distance;
    if(t<timing.landAt){
      const u=clamp((t-timing.launchAt)/(timing.landAt-timing.launchAt),0,1);
      let y,drift,spin,axis='z';
      if(sp.launch==='skid'){
        // Low and flat: lands on its side at 55 % and skids the rest.
        const v=Math.min(1,u/.55),w=clamp((u-.55)/.45,0,1);
        y=u<.55?1.3*Math.pow(1-v,1.5):0;
        drift=u<.55?.3+3.0*v:3.3+(L-3.3)*(1-(1-w)*(1-w));
        spin=Math.PI*(.6+.4*Math.min(1,v*1.4));
      }else if(sp.launch==='roll'){
        // Spins sideways (a barrel roll about its direction of travel).
        y=sp.launchHeight*1.05*Math.pow(1-u,1.4);
        drift=.3+(L-.3)*Math.pow(u,.8);
        spin=Math.PI*2*sp.spin*u+Math.PI*.4;axis='x';
      }else{
        // High blast: falls in from the top of the frame, tumbling end over end.
        y=sp.launchHeight*1.35*Math.pow(1-u,1.6);
        drift=.3+(L-.3)*Math.pow(u,.8);
        spin=Math.PI*(1+1.6*sp.spin*u);
      }
      launch=Object.freeze({u,landed:false,y,drift:away*drift,spin:axis==='z'?away*spin:spin,axis});
    }else{
      // Body-first landing (it lies on its side: the knockout pose), a heavy
      // slam and second bounce for a blast, then a get-up if it survived.
      const age=landAge;
      const bounce=sp.launch==='blast'?(age<200?.34*Math.sin(Math.PI*age/200):
        age<380?.12*Math.sin(Math.PI*(age-200)/180):0):
        sp.launch==='roll'&&age<220?.14*Math.sin(Math.PI*age/220):0;
      const downFor=SOLO_MS.downHold,getUp=SOLO_MS.getUp;
      const rising=!event.knockout&&age>downFor?clamp((age-downFor)/getUp,0,1):0;
      launch=Object.freeze({u:1,landed:true,y:bounce,drift:away*L,spin:0,axis:'z',
        down:event.knockout?1:1-rising,rising});
    }
  }
  // The attacker roars at the lens under its title card.
  const roar=t<timing.titleIn||t>=A?0:
    ease((t-timing.titleIn-120)/220)*(1-ease((t-(A-340))/240));
  const stage=fire>0?'fire':redSky?'red':null;
  return Object.freeze({active:true,roar,stage,strike:sp.strike,
    showAttacker:!(t>=timing.launchAt&&t<timing.returnAt),
    showDefender:!(t>=timing.titleIn&&t<timing.launchAt),
    flash,aura,fire,glint,burst,streak,slash,redSky,lunge,shake,launch,tilt:lunge>0?sp.tilt:0,
    pops:t>=timing.landAt&&t<timing.landAt+SOLO_MS.pop?1:0});
}
// World slots: player one is LEFT (-X), player two is RIGHT (+X).
// Framing must never infer a side from the name of the animal: Bear may
// occupy either slot and mirror matches have identical move choreography.
function sideX(slot){return slot===0?-2.02:slot===1?2.02:NaN;}
// Every cut is a genuinely different view direction around the winner.
// The 2026-11-16 review exposed why four changes in zoom alone look like one
// long profile shot. All locations remain centered on the correct slot.
function camera(event,elapsed,nativeMs){
  const beat=shot(event,elapsed,nativeMs);
  const attackerX=sideX(event.attacker),defenderX=sideX(event.defender);
  if(!Number.isFinite(attackerX)||!Number.isFinite(defenderX)||
      attackerX===defenderX)throw new RangeError('Cinematic slots must be distinct');
  const facing=event.attacker===0?1:-1;
  let x=0,targetX=0,y=2.8,z=12.2,targetY=1.23,zoom=1;
  if(beat.solo){
    const view=soloView(event,elapsed,nativeMs),T=beat.timing;
    const H=SOLO_SCALE[event.attackerId]||1,Hd=SOLO_SCALE[event.defenderId]||1;
    const charge=T.strike==='charge';
    if(beat.shot==='clash'){x=0;targetX=0;y=2.6;z=11.6;targetY=1.25;zoom=1.02;}
    else if(beat.shot==='soloTitle'){
      // Low profile push-in on the arena stage under the title card.
      const p=ease((beat.local-T.titleIn)/Math.max(1,T.actionLead-T.titleIn));
      x=attackerX+facing*1.0;y=.78*H;z=(6.8-1.2*p)*H;
      targetX=attackerX+facing*.35;targetY=1.02*H;zoom=1.0;
    }else if(beat.shot==='soloRise'){
      // Head-on and low: the attacker crouched and coiled, filling the frame.
      x=attackerX+facing*(charge?7.4:6.0)*H;y=.8*H;z=1.4*H;
      targetX=attackerX+facing*(charge?.8:0);targetY=1.1*H;zoom=1.0;
    }else if(beat.shot==='soloRear'){
      // Flash cut: closer as it rears (or as it closes on the lens).
      if(charge){x=attackerX+facing*6.6*H;y=.95*H;z=.9*H;targetX=attackerX+facing*1.6;targetY=.95*H;}
      else{x=attackerX+facing*5.4*H;y=1.25*H;z=1.9*H;targetX=attackerX;targetY=1.75*H;}
      zoom=1.0;
    }else if(beat.shot==='soloFire'){
      // The strike against the fire void, the full rear-up in frame.
      x=attackerX+facing*7.4*H;y=1.15*H;z=2.5*H;targetX=attackerX;targetY=1.9*H;zoom=1.0;
    }else if(beat.shot==='lunge'){
      // The runtime dollies this into the animal's face from the live head
      // bone (view.lunge 0→1); this is the framing it starts from.
      if(T.strike==='fire'){x=attackerX+facing*7.4*H;y=1.15*H;z=2.5*H;targetY=1.9*H;}
      else if(charge){x=attackerX+facing*6.6*H;y=.95*H;z=.9*H;targetY=.95*H;}
      else{x=attackerX+facing*5.4*H;y=1.25*H;z=1.9*H;targetY=1.75*H;}
      targetX=attackerX;zoom=1.0;
    }else if(beat.shot==='launch'){
      // The victim alone, tumbling; horizon low so the red sky fills the frame.
      // Fixed camera behind the victim's start, looking along its flight:
      // it drops in from the top of the frame and recedes (reference 19.9–20.5).
      const away=event.attacker===0?1:-1;
      x=defenderX-away*4.4;y=1.9*Hd;z=1.1;
      targetX=defenderX+away*4.2;targetY=.85*Hd;zoom=1.0;
    }else if(beat.shot==='landing'){
      // Hard cut to the arena wide: the landing in the distance.
      const away=event.attacker===0?1:-1,landX=defenderX+away*(soloSpec(event)?.distance||2);
      targetX=landX;targetY=.75;x=landX-away*2.6;y=2.3;z=11.6;zoom=1.0;
    }else{x=0;targetX=0;y=2.8;z=12.2;targetY=1.23;zoom=1;}
    const k=reducedShake(view.shake);
    return Object.freeze({x:x+.11*k,y:y+.06*k,z,targetX,targetY,zoom,
      angle:(event.attacker===0?1:-1)*(view.tilt||0)*(beat.shot==='lunge'?1:0),
      beat:beat.beat,shot:beat.shot,cut:true,lunge:view.lunge,
      snap:beat.shot==='launch'||beat.shot==='lunge'});
  }else if(beat.beat==='VICTORY'){
    // Reference win (2026-11-24 footage): the winner stays on all fours in
    // its fire aura and walks at the lens roaring, cut as side → front
    // three-quarter → low roar close-up → wide, then the sky outro.
    const ap=victoryApproach(beat.local);
    const wx=attackerX+facing*ap.travel,wz=ap.depth;
    const hx=facing*Math.cos(ap.turn),hz=Math.sin(ap.turn);
    let nx=-hz,nz=hx;if(nz<0){nx=-nx;nz=-nz;}
    const H=SOLO_SCALE[event.attackerId]||1;
    const at=(fwd,side,cy,ty)=>{x=wx+hx*fwd+nx*side;z=wz+hz*fwd+nz*side;y=cy*H;targetX=wx;targetY=ty*H;return wz;};
    if(beat.shot==='vicSide')at(.6,6.2,1.05,.95);
    else if(beat.shot==='vicFront')at(5.4,2.2,1.0,1.0);
    else if(beat.shot==='vicRoar')at(3.6,1.0,.62,1.12);
    else at(8.6,3.0,1.7,.95);
    zoom=1.0;
    return Object.freeze({x,y,z,targetX,targetY,targetZ:wz,zoom,angle:0,
      beat:beat.beat,shot:beat.shot,cut:true,outro:beat.local>=VICTORY_OUTRO_MS?
        clamp((beat.local-VICTORY_OUTRO_MS)/420,0,1):0});
  }else if(beat.beat==='FOCUS'){
    // Each technique earns its own visual identity, not the same generic
    // closeup of Bear's face before every strike.
    targetX=attackerX;
    if(event.move==='G'){
      // The heavy charge gathers weight from a low rear-quarter view.
      x=attackerX-facing*2.3;y=1.1;z=6.9;
      targetY=1.08;zoom=1.09;
    }else if(event.move==='T'){
      // Paw-level preparation emphasizes the lowered swipe.
      x=attackerX+facing*1.25;y=.78;z=6.25;
      targetY=.83;zoom=1.22;
    }else if(event.move==='P'){
      // The high strike is introduced from a front quarter at head height.
      // The restaged wind-up keeps the Bear low during this beat, so the old
      // tight, high framing (y 2.18, zoom 1.29, z 2.5) showed only a hump of
      // back fur in the 8:42 PM recording. Pull back so head and forepaws read.
      x=attackerX+facing*4.6;y=1.85;z=4.4;
      targetY=1.3;zoom=1.08;
    }else{
      // Special remains the largest, most frontal moment.
      x=attackerX+facing*6.65;y=1.8;z=2.9;
      targetY=1.88;zoom=1.29;
    }
  }else if(beat.shot==='rush'){
    // Compressed, low front-third shot, distinct from anticipation and the
    // wide impact; the rapid edit is a signature action punctuation.
    x=defenderX-facing*1.18;targetX=0;
    y=1.22;z=9.1;targetY=1.16;zoom=1.06;
  }else if(beat.shot==='sweep'){
    x=attackerX+facing*.95;targetX=attackerX+facing*.48;
    y=.85;z=8.8;targetY=.82;zoom=1.06;
  }else if(beat.beat==='MIRACLE'){
    x=0;targetX=0;y=3.1;z=12.3;zoom=.96;
  }else if(beat.beat==='INTRO'&&event.move==='G'){
    // Introduce where both animals are before the charge: previous hero
    // closeup made Bear appear to teleport across the Moose.
    x=0;targetX=0;y=2.8;z=12.8;zoom=.94;
  }else if(beat.beat==='CONTACT'){
    // Impact is readable only if both combatants share the frame.
    x=0;targetX=0;y=2.2;z=12.2;
    targetY=1.28;zoom=1.02;
  }else if(beat.beat==='REACTION'){
    x=defenderX-facing*.45;targetX=defenderX;
    y=2.55;z=10.1;targetY=1.22;zoom=.98;
  }else if(beat.beat==='INTRO'){
    targetX=attackerX+facing*.48;
    x=attackerX+facing*.98;
    y=event.move==='T'?1.32:1.85;
    z=9.4;targetY=event.move==='P'?1.55:1.18;zoom=1.04;
  }else{
    // Attack travel shot leaves visible screen-space for the victim.
    x=attackerX+facing*1.1;targetX=attackerX+facing*.72;
    y=event.move==='P'?2.05:2.1;
    // High Paw Strike's key pose rears the Bear to full height: frame its head.
    z=event.move==='P'?12.2:10.8;targetY=event.move==='P'?1.9:1.3;zoom=1.00;
  }
  // Once an ordinary exchange has finished, the result card and the next
  // reels play over a neutral two-shot. Holding the defender close-up left
  // the attacker cut off at the edge for the whole result pause.
  // Long native recoveries (Low Swipe is 4 s) must not hold the close-up.
  const settled=!event.finished&&beat.beat==='REACTION'&&
    beat.local>=Math.min(beat.timing.finish-beat.timing.actionLead,beat.timing.contact+1300);
  if(settled){x=0;targetX=0;y=2.8;z=12.2;targetY=1.23;zoom=1;}
  // Cine director framing guard: all four victory angles must keep the
  // entire standing animal inside a perspective viewport. Preserve each
  // distinct azimuth by dollying along the shot ray rather than forcing
  // another generic side view. The 9:49 AM recording failed this guard.
  const age=beat.local-beat.timing.contact;
  const punch=beat.beat==='CONTACT'&&!beat.solo?
    Math.max(0,1-Math.max(0,age)/145):0;
  const shake=beat.beat==='CONTACT'?Math.sin(age*.16)*.085*punch:0;
  return Object.freeze({x:x+shake,y:y+shake*.35,z,targetX,targetY,
    zoom:zoom+.075*punch,angle:0,
    beat:beat.beat,shot:beat.shot,cut:true});
}
// A sub-100ms impact freeze is a core part of the original arcade's
// perceived force. It freezes both rigs for the first impact frames while
// audio, sparks and the shot remain active; the battle clock never pauses.
// In the original-game victory, the animal earns its finish: it gathers
// breath, lowers the muzzle, then throws its head back and cries. A motion
// curve, not a camera zoom, drives this sequence on the user's local rig.
// From the actual reference footage: the winner approaches on four paws,
// looks up, roars, and only then the result transitions away. The user
// approved the first three existing victory camera cuts; this retimes
// the final cut to feature movement instead of a static hind-leg idle.
// Victory timing from the reference (video_1 49.3–55 s, video_4 41.3–46.7 s):
// PERFECT!/You win! slam within ~0.3 s of the win, ~2.4 s of quick cuts of
// the winner walking at the lens and roaring, then a sky-coloured outro
// holding the banner.
const VICTORY_SHOTS=Object.freeze([['vicSide',0],['vicFront',560],['vicRoar',1060],['vicWide',1800]]);
const VICTORY_BANNER_MS=280;       // "You win!" (PERFECT! lands at 0 when earned)
const VICTORY_HOWL_START_MS=700;   // inhale
const VICTORY_HOWL_CUE_MS=1060;    // roar sound with the jaw drop, on the close-up
const VICTORY_APPROACH_END_MS=2300;
const VICTORY_OUTRO_MS=2450;
const VICTORY_END_MS=4700;
// Kept for older callers; the winner no longer rears up.
const VICTORY_LOWER_START_MS=0,VICTORY_LOWER_READY_MS=0,VICTORY_APPROACH_START_MS=0;
function victoryShot(v){let name=VICTORY_SHOTS[0][0];for(const [n,at] of VICTORY_SHOTS)if(v>=at)name=n;return name;}
function victoryApproach(victoryElapsed){
  const elapsed=Math.max(0,Number(victoryElapsed)||0);
  // Walks diagonally toward centre and the lens, turned to face its path.
  const step=clamp(elapsed/VICTORY_APPROACH_END_MS,0,1);
  const glide=step<.85?step:(.85+.15*ease((step-.85)/.15));
  const turn=.93*ease(elapsed/420);
  return Object.freeze({lowered:1,step,active:elapsed<VICTORY_APPROACH_END_MS,stride:0,
    travel:.95*glide,depth:1.25*glide,turn});
}
function bearHowl(victoryElapsed){
  const elapsed=Math.max(0,Number(victoryElapsed)||0);
  const zero=Object.freeze({active:false,phase:'stand',intensity:0,
    headPitch:0,headYaw:0,neckPitch:0,chestPitch:0,jawOpen:0,
    forePaw:0,bodyLean:0,bodyDrop:0,breath:0});
  if(elapsed<VICTORY_HOWL_START_MS)return zero;
  const H0=VICTORY_HOWL_START_MS;
  const inhale=ease((elapsed-H0)/200);
  const throwBack=ease((elapsed-(H0+200))/240);
  const open=ease((elapsed-(VICTORY_HOWL_CUE_MS-60))/200);
  const fade=ease((elapsed-2900)/700);
  const vocal=Math.sin((elapsed-VICTORY_HOWL_CUE_MS)*.021);
  return Object.freeze({
    active:true,
    phase:elapsed<H0+200?'inhale':elapsed<VICTORY_HOWL_CUE_MS?'throw':
      elapsed<2900?'roar':'hold',
    intensity:inhale*(1-.3*fade),
    // Head comes up toward the low lens, mouth wide, as it walks in.
    headPitch:(.10*inhale-.30*throwBack+.012*vocal*open)*(1-.6*fade),
    headYaw:.04*throwBack*Math.sin(elapsed*.003),
    neckPitch:(.05*inhale-.22*throwBack)*(1-.6*fade),
    chestPitch:(.06*inhale-.10*throwBack)*(1-.6*fade),
    jawOpen:clamp((.96+.04*vocal)*open*(1-.85*fade),0,1),
    forePaw:0,bodyLean:.04*inhale-.05*throwBack,bodyDrop:0,
    breath:(.7+.22*Math.abs(vocal))*open*(1-fade)
  });
}
const HIT_STOP_MS=88;
function hitStop(event,elapsed,nativeMs){
  if(!event||!Number.isFinite(elapsed))return false;
  const timing=duration(event,nativeMs);
  const age=elapsed-timing.actionLead-timing.contact;
  return age>=0&&age<(timing.solo?(timing.hitStop||SOLO_MS.hitStop):HIT_STOP_MS);
}
// Art-direct root motion independently from the imported attack FBX.
// Source FBXs may contain long horizontal RigRoot translations; these must
// not fling an animal through/behind its opponent. The pivot owns travel.
// Skeleton gap (front bone of attacker → nearest bone of defender, idle
// pose) that each native strike still leaves open at contact. Measured on the
// private Bear rig: without closing, paws stopped 0.75–0.95 units short of
// the Moose. The runtime closes the idle gap down to these values so the
// strike lands with ~0.25 units of bone clearance (skin on skin).
const CONTACT_KEEP=Object.freeze({
  bear:Object.freeze({G:1.50,T:1.22,P:1.55,S:1.55}),
  moose:Object.freeze({G:1.05,T:0.35,P:0.70,S:1.00})
});
function contactKeep(attackerId,move){
  return (CONTACT_KEEP[attackerId]||CONTACT_KEEP.bear)[move]??1.3;
}
function blocking(event,elapsed,nativeMs){
  const timing=duration(event,nativeMs);
  const t=Math.max(0,(Number(elapsed)||0)-timing.actionLead);
  const contact=timing.contact;
  const move=event.move;
  const travel={G:.84,T:.24,P:.43,S:.68}[move];
  const windup={G:.18,T:.28,P:.31,S:.23}[move];
  const start=contact*windup;
  const approach=ease(clamp((t-start)/Math.max(1,contact-start),0,1));
  const withdrawal=1-ease(clamp((t-contact-110)/540,0,1));
  const offset=travel*approach*withdrawal;
  const prep=ease(clamp(t/Math.max(1,start),0,1))*
    (1-ease(clamp((t-start)/Math.max(1,contact-start),0,1)));
  const strike=ease(clamp((t-contact+80)/150,0,1))*
    (1-ease(clamp((t-contact-120)/360,0,1)));
  const recoilMs=Math.max(0,t-contact);
  const recoil=ease(clamp(recoilMs/140,0,1))*
    (1-ease(clamp((recoilMs-120)/510,0,1)));
  return Object.freeze({
    attackerTravel:offset,closing:approach*withdrawal,windup:prep,strike,recoil,
    // These small rig-container adjustments give impact mass without
    // forcing every animal to use the same procedural leg animation.
    attackerLean:-.045*prep+.085*strike,
    attackerLift:move==='P' ? -.035*prep+.035*strike :
      move==='G' ? -.025*prep+.018*strike : -.018*prep+.01*strike,
    defenderTravel:{G:.38,T:.24,P:.44,S:.52}[move]*recoil,
    // A knockout is not a bounce: the loser is driven back and stays there.
    defenderKnock:{G:.62,T:.48,P:.78,S:.90}[move]*
      ease(clamp(recoilMs/260,0,1)),
    defenderLean:-.060*recoil,
    contact,ready:t>=contact,ended:t>=timing.finish-timing.actionLead,
    move
  });
}
function panel(event,elapsed,nativeMs){
  const b=shot(event,elapsed,nativeMs);
  const descriptor=spec(event.attackerId,event.move),m=miracle(event.miracleName);
  const sp=soloSpec(event);
  const title=b.beat==='MIRACLE'?m?.label||'MIRACLE':
    b.beat==='FOCUS'?descriptor.name:
    b.beat==='VICTORY'?'VICTORY':descriptor.name;
  const focusSub={G:'GATHER THE FORCE',T:'LOW AND PRECISE',
    P:'RISE FOR THE FINISH',S:'UNLEASH THE WILD'};
  const sub=b.solo&&(b.beat==='TITLE'||b.beat==='FOCUS')?sp.rank:
    b.solo&&(b.beat==='LAUNCH'||b.beat==='IMPACT')?String(event.damage):
    b.beat==='MIRACLE'?'A WILD FORCE AWAKENS':
    b.beat==='FOCUS'?focusSub[event.move]:
    b.beat==='CONTACT'?'DIRECT HIT':
    b.beat==='REACTION'?('−'+event.damage+' · '+(event.knockout?'KNOCKOUT':'HIT REACTION')):
    b.beat==='VICTORY'?'THE WILD HAS A CHAMPION':
    'GUTS · TECHNIQUE · POWER';
  return Object.freeze({beat:b.beat,title,sub,accent:b.accent,solo:Boolean(b.solo),
    miracle:b.beat==='MIRACLE'?m?.type||'starfall':null,
    attacker:event.attacker,defender:event.defender,finished:b.beat==='VICTORY',
    duration:b.timing.total});
}
return Object.freeze({ATTACKS,MIRACLES,POSES,HIT_STOP_MS,
  VICTORY_LOWER_START_MS,VICTORY_LOWER_READY_MS,
  VICTORY_APPROACH_START_MS,VICTORY_APPROACH_END_MS,
  VICTORY_HOWL_START_MS,VICTORY_HOWL_CUE_MS,VICTORY_BANNER_MS,VICTORY_END_MS,VICTORY_OUTRO_MS,VICTORY_SHOTS,victoryShot,
  spec,miracle,duration,shot,camera,victoryApproach,bearHowl,hitStop,blocking,contactKeep,setMeasuredContact,clearMeasuredContacts,measuredContact,staging,MOOSE_CONTACT,keyPose,KEY_POSES,POSE_FIELDS,SOLO,SOLO_MS,SOLO_SCALE,LAUNCH_MS,DISPLAY_SCALE,soloSpec,soloView,panel});
});
