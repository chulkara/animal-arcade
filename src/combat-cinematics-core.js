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
    clamp(attack*.47,180,1400);
  const miracleLead=event.miracleName?850:0;
  const finish=miracleLead+Math.max(attack+260,contact+580);
  return Object.freeze({attack,contact,miracleLead,finish,
    victoryStart:event.finished?finish+100:Infinity,
    total:event.finished?finish+3800:finish+480});
}
function shot(event,elapsed,nativeMs){
  const timing=duration(event,nativeMs);
  const t=clamp(Number(elapsed)||0,0,timing.total);
  const descriptor=spec(event.attackerId,event.move);
  if(t<timing.miracleLead)
    return Object.freeze({name:'miracle',beat:'MIRACLE',shot:'wide',pose:POSES.wide,
      local:t,progress:timing.miracleLead? t/timing.miracleLead:1,timing,
      accent:miracle(event.miracleName)?.accent||'gold'});
  if(event.finished&&t>=timing.victoryStart){
    const v=t-timing.victoryStart;
    const stage=v<950?0:v<1930?1:v<2900?2:3;
    const name=['lowHero','sideHero','highHero','finale'][stage];
    return Object.freeze({name,beat:'VICTORY',shot:name,pose:POSES[name],local:v,
      progress:clamp(v/3800,0,1),timing,accent:descriptor.accent});
  }
  const attackTime=t-timing.miracleLead,contact=timing.contact;
  let stage,beat;
  if(attackTime<Math.min(contact*.32,340)){stage=0;beat:'INTRO';}
  else if(attackTime<contact){stage=1;beat='ATTACK';}
  else if(attackTime<contact+150){stage=2;beat='CONTACT';}
  else {stage=3;beat='REACTION';}
  const name=descriptor.shots[stage];
  return Object.freeze({name,beat,shot:name,pose:POSES[name],local:attackTime,
    progress:clamp(attackTime/timing.attack,0,1),timing,accent:descriptor.accent});
}
function camera(event,elapsed,nativeMs){
  const beat=shot(event,elapsed,nativeMs);
  let {x,y,z,targetY,zoom,angle}=beat.pose;
  const a=event.attacker===1?-1:1;
  const d=event.defender===0?-1:1;
  const focus=beat.beat==='CONTACT'||beat.beat==='REACTION'?d:a;
  // Shots stay identical for a given attack; only defender framing/recoil
  // is mirrored with the opponent. Mirror fights remain camera-safe.
  x*=focus;
  if(beat.shot==='impact'||beat.shot==='recoil')x=1.50*focus;
  if(beat.shot==='wide'||beat.shot==='finale')x=beat.shot==='wide'?0:.8*a;
  if(beat.beat==='VICTORY')x=(beat.shot==='finale'?.8:1.65)*a;
  const shake=beat.beat==='CONTACT'?Math.sin(beat.local*1.45)*.07:0;
  return Object.freeze({x:x+shake,y,z,targetX:beat.beat==='CONTACT'?1.45*d:
    beat.beat==='REACTION'?1.45*d:beat.beat==='VICTORY'?1.65*a:beat.shot==='wide'?0:1.65*a,
    targetY,zoom,angle,beat:beat.beat,shot:beat.shot,
    cut:beat.shot==='impact'||beat.beat==='VICTORY'});
}
function panel(event,elapsed,nativeMs){
  const b=shot(event,elapsed,nativeMs);
  const descriptor=spec(event.attackerId,event.move),m=miracle(event.miracleName);
  const title=b.beat==='MIRACLE'?m?.label||'MIRACLE':
    b.beat==='VICTORY'?'VICTORY':descriptor.name;
  const sub=b.beat==='MIRACLE'?'A WILD FORCE AWAKENS':
    b.beat==='CONTACT'?'DIRECT HIT':
    b.beat==='REACTION'?('−'+event.damage+' · '+(event.knockout?'KNOCKOUT':'HIT REACTION')):
    b.beat==='VICTORY'?'THE WILD HAS A CHAMPION':
    'GUTS · TECHNIQUE · POWER';
  return Object.freeze({beat:b.beat,title,sub,accent:b.accent,
    miracle:b.beat==='MIRACLE'?m?.type||'starfall':null,
    attacker:event.attacker,defender:event.defender,finished:b.beat==='VICTORY',
    duration:b.timing.total});
}
return Object.freeze({ATTACKS,MIRACLES,POSES,spec,miracle,duration,shot,camera,panel});
});
