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
function duration(event,nativeMs){
  if(!ATTACKS[event?.attackerId]?.[event?.move])throw new RangeError('Invalid battle event');
  const attack=length(event,nativeMs);
  const contact=event.attackerId==='moose'?{G:830,T:680,P:1220,S:1330}[event.move]:
    clamp(Math.round(attack*{G:.58,T:.68,P:.74,S:.69}[event.move]),
      180,Math.min(attack+180,2400));
  const miracleLead=event.miracleName?850:0;
  // The reference takes time to prepare a signature move. Our previous
  // edit triggered the native FBX on frame one, so no strike had a buildup.
  const focusLead={G:340,T:380,P:780,S:880}[event.move];
  const actionLead=miracleLead+focusLead;
  const finish=actionLead+Math.max(attack+260,contact+580);
  const victoryStart=event.finished?finish+180:Infinity;
  return Object.freeze({attack,contact,miracleLead,focusLead,actionLead,finish,
    victoryStart,total:event.finished?victoryStart+4000:finish+480});
}
function shot(event,elapsed,nativeMs){
  const timing=duration(event,nativeMs);
  const t=clamp(Number(elapsed)||0,0,timing.total);
  const descriptor=spec(event.attackerId,event.move);
  if(t<timing.miracleLead)
    return Object.freeze({name:'miracle',beat:'MIRACLE',shot:'wide',pose:POSES.wide,
      local:t,progress:timing.miracleLead? t/timing.miracleLead:1,timing,
      accent:miracle(event.miracleName)?.accent||'gold'});
  if(t<timing.actionLead)
    return Object.freeze({name:'focus',beat:'FOCUS',shot:'focus',pose:POSES.hunter,
      local:t-timing.miracleLead,progress:(t-timing.miracleLead)/timing.focusLead,
      timing,accent:descriptor.accent});
  if(event.finished&&t>=timing.victoryStart){
    const v=t-timing.victoryStart;
    const stage=v<900?0:v<1850?1:v<2900?2:3;
    const name=['lowHero','sideHero','highHero','finale'][stage];
    return Object.freeze({name,beat:'VICTORY',shot:name,pose:POSES[name],local:v,
      progress:clamp(v/3800,0,1),timing,accent:descriptor.accent});
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
  if(beat.beat==='VICTORY'){
    targetX=attackerX;
    if(beat.shot==='lowHero'){
      // A low front-quarter view must preserve the full winning silhouette,
      // not cut the head off as the upright native clip rises.
      x=attackerX+facing*5.0;y=.82;z=4.7;
      targetY=1.55;zoom=1.05;
    }else if(beat.shot==='sideHero'){
      // Reverse angle: the viewer now sees the opposite flank.
      x=attackerX-facing*4.5;y=2.05;z=5.0;
      targetY=1.58;zoom=1.08;
    }else if(beat.shot==='highHero'){
      // Clearly overhead, not another chest-height profile.
      x=attackerX+facing*3.2;y=7.3;z=4.5;
      targetY=1.55;zoom=1.00;
    }else{
      // The arcade reference closes on the winner's face, not on an
      // empty wide arena. Reserve the last cut for a real portrait.
      // The 9:49 AM recording proves the 4.45-unit portrait shot is
      // unusable: it fills the whole display with fur and excludes the head.
      // Return to the longer front view from the better 9:13 AM take.
      x=attackerX+facing*8.2;y=2.50;z=1.5;
      targetX=attackerX;targetY=1.85;zoom=1.08;
    }
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
      // The high strike is introduced looking into the rising bear's face.
      x=attackerX+facing*5.75;y=2.18;z=2.5;
      targetY=2.02;zoom=1.29;
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
    y=event.move==='P'?1.65:2.1;
    z=10.8;targetY=1.3;zoom=1.00;
  }
  // Cine director framing guard: all four victory angles must keep the
  // entire standing animal inside a perspective viewport. Preserve each
  // distinct azimuth by dollying along the shot ray rather than forcing
  // another generic side view. The 9:49 AM recording failed this guard.
  if(beat.beat==='VICTORY'){
    const distance=Math.hypot(x-targetX,y-targetY,z);
    const minDistance=10.0;
    const factor=Math.max(1,minDistance/Math.max(.001,distance));
    x=targetX+(x-targetX)*factor;
    y=targetY+(y-targetY)*factor;
    z*=factor;
    zoom=Math.min(1.08,zoom);
  }
  const age=beat.local-beat.timing.contact;
  const punch=beat.beat==='CONTACT'?
    Math.max(0,1-Math.max(0,age)/145):0;
  const shake=beat.beat==='CONTACT'?Math.sin(age*.16)*.085*punch:0;
  return Object.freeze({x:x+shake,y:y+shake*.35,z,targetX,targetY,
    zoom:zoom+.075*punch,angle:0,
    beat:beat.beat,shot:beat.shot,cut:true});
}
// A sub-100ms impact freeze is a core part of the original arcade's
// perceived force. It freezes both rigs for the first impact frames while
// audio, sparks and the shot remain active; the battle clock never pauses.
const VICTORY_HOWL_START_MS=2900;
// End the four-angle victory on a vocal, head-raised Bear rather than a
// motionless upright idle. Values are rig-independent normalized controls;
// the FBX adapter handles specific head/neck/jaw bones or morph targets.
function bearHowl(victoryElapsed){
  const elapsed=Math.max(0,Number(victoryElapsed)||0);
  const t=elapsed-VICTORY_HOWL_START_MS;
  if(t<0)return Object.freeze({active:false,intensity:0,
    headPitch:0,neckPitch:0,chestPitch:0,jawOpen:0,
    forePaw:0,breath:0});
  const intensity=ease(t/410);
  const vocal=t>340?Math.sin((t-340)*.018):0;
  // Hold the head-raised expression after the camera montage completes.
  return Object.freeze({active:true,intensity,
    headPitch:-.30*intensity+.012*vocal,
    neckPitch:-.17*intensity,
    chestPitch:-.075*intensity,
    jawOpen:clamp((.82+.11*vocal)*intensity,0,1),
    forePaw:-.075*intensity,
    breath:(.78+.22*Math.abs(vocal))*intensity});
}
const HIT_STOP_MS=88;
function hitStop(event,elapsed,nativeMs){
  if(!event||!Number.isFinite(elapsed))return false;
  const timing=duration(event,nativeMs);
  const age=elapsed-timing.actionLead-timing.contact;
  return age>=0&&age<HIT_STOP_MS;
}
// Art-direct root motion independently from the imported attack FBX.
// Source FBXs may contain long horizontal RigRoot translations; these must
// not fling an animal through/behind its opponent. The pivot owns travel.
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
    attackerTravel:offset,windup:prep,strike,recoil,
    // These small rig-container adjustments give impact mass without
    // forcing every animal to use the same procedural leg animation.
    attackerLean:-.045*prep+.085*strike,
    attackerLift:move==='P' ? -.035*prep+.035*strike :
      move==='G' ? -.025*prep+.018*strike : -.018*prep+.01*strike,
    defenderTravel:{G:.38,T:.24,P:.44,S:.52}[move]*recoil,
    defenderLean:-.060*recoil,
    contact,ready:t>=contact,ended:t>=timing.finish-timing.actionLead,
    move
  });
}
function panel(event,elapsed,nativeMs){
  const b=shot(event,elapsed,nativeMs);
  const descriptor=spec(event.attackerId,event.move),m=miracle(event.miracleName);
  const title=b.beat==='MIRACLE'?m?.label||'MIRACLE':
    b.beat==='FOCUS'?descriptor.name:
    b.beat==='VICTORY'?'VICTORY':descriptor.name;
  const focusSub={G:'GATHER THE FORCE',T:'LOW AND PRECISE',
    P:'RISE FOR THE FINISH',S:'UNLEASH THE WILD'};
  const sub=b.beat==='MIRACLE'?'A WILD FORCE AWAKENS':
    b.beat==='FOCUS'?focusSub[event.move]:
    b.beat==='CONTACT'?'DIRECT HIT':
    b.beat==='REACTION'?('−'+event.damage+' · '+(event.knockout?'KNOCKOUT':'HIT REACTION')):
    b.beat==='VICTORY'?'THE WILD HAS A CHAMPION':
    'GUTS · TECHNIQUE · POWER';
  return Object.freeze({beat:b.beat,title,sub,accent:b.accent,
    miracle:b.beat==='MIRACLE'?m?.type||'starfall':null,
    attacker:event.attacker,defender:event.defender,finished:b.beat==='VICTORY',
    duration:b.timing.total});
}
return Object.freeze({ATTACKS,MIRACLES,POSES,HIT_STOP_MS,VICTORY_HOWL_START_MS,
  spec,miracle,duration,shot,camera,bearHowl,hitStop,blocking,panel});
});
