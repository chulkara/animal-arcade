/* Original procedural combat motion scores for the Tiger (no copyrighted moves).
 * Time-domain choreography, independent of framerate, DOM and renderer.
 * Native Idle/Howl/Run clips are preserved; staging is additive.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsTigerActionCore=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const FIELDS=Object.freeze(['travel','lift','pitch','roll','neck','head','headYaw','jaw','foreleg','tail']);
  const ZERO=Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,0])));
  const k=(ms,mode,values={})=>Object.freeze({ms,mode,...ZERO,...values});
  // Stage-distance is in THREE scene units. Rotations are small radians:
  // deliberately bounded until real quadruped pose clips pass visual review.
  const SCORES=Object.freeze({
    G:Object.freeze([
      k(0,'idle'),k(160,'idle',{travel:-.09,lift:-.04,pitch:.08,head:.06}),
      k(300,'run',{travel:.04,lift:.02,pitch:-.04}),
      k(560,'run',{travel:.68,lift:.08,pitch:-.10}),
      k(700,'idle',{travel:.81,lift:.03,pitch:-.12,neck:-.12,foreleg:.25,jaw:.12}),
      k(850,'idle',{travel:.72,lift:0,pitch:.04,foreleg:-.06}),
      k(1260,'idle')
    ]),
    T:Object.freeze([
      k(0,'idle'),k(100,'idle',{travel:-.05,pitch:.06,head:-.06}),
      k(190,'run',{travel:.10,lift:.09}),
      k(440,'run',{travel:.76,lift:.17,pitch:-.08}),
      k(530,'idle',{travel:.84,lift:.21,roll:.07,foreleg:.31,head:-.12}),
      k(690,'idle',{travel:.70,lift:.02,foreleg:-.03}),
      k(1110,'idle')
    ]),
    P:Object.freeze([
      k(0,'idle'),k(260,'idle',{travel:-.16,lift:-.08,pitch:.13,head:.12,jaw:.16}),
      k(390,'run',{travel:.02,lift:.04,pitch:-.06}),
      k(680,'run',{travel:.74,lift:.08,pitch:-.16}),
      k(825,'idle',{travel:.86,lift:.01,pitch:-.19,neck:-.18,head:.09,jaw:.38,foreleg:.21}),
      k(1060,'idle',{travel:.66,pitch:.05,head:-.08}),
      k(1450,'idle')
    ]),
    SPECIAL:Object.freeze([
      k(0,'howl'),k(350,'howl',{lift:.08,head:-.12,jaw:.30,neck:-.12}),
      k(600,'idle',{travel:-.09,lift:-.05,pitch:.12,jaw:.11}),
      k(770,'run',{travel:.02,pitch:-.03}),
      k(1080,'run',{travel:.82,lift:.10,pitch:-.13}),
      k(1210,'idle',{travel:.91,lift:.02,head:-.20,jaw:.42,foreleg:.30}),
      k(1440,'idle',{travel:.62,head:.03}),
      k(1820,'idle')
    ]),
    HURT:Object.freeze([
      k(0,'idle'),k(115,'idle',{travel:-.14,lift:.07,pitch:-.10,head:.16,neck:.10,roll:.06,jaw:.08}),
      k(260,'idle',{travel:-.27,lift:-.07,pitch:.10,head:.17,roll:-.06}),
      k(520,'idle',{travel:-.13,head:-.05}),k(860,'idle')
    ]),
    KO:Object.freeze([
      k(0,'idle'),k(180,'idle',{travel:-.17,lift:.07,head:.23,roll:.10}),
      k(580,'idle',{travel:-.31,lift:-.28,pitch:.20,roll:.22,head:.24,jaw:.08}),
      k(1100,'idle',{travel:-.38,lift:-.45,pitch:.37,roll:.34,head:.28}),
      k(1600,'idle',{travel:-.38,lift:-.45,pitch:.37,roll:.34,head:.28})
    ]),
    VICTORY:Object.freeze([
      k(0,'howl'),k(300,'howl',{lift:.04,head:-.12,neck:-.05}),
      k(850,'howl',{lift:.12,pitch:-.05,head:-.18,jaw:.18}),
      k(1700,'howl',{lift:.03,head:-.07}),
      k(2300,'idle')
    ])
  });
  function selectScore(kind,technique='G',special=false){
    if(kind==='attack')return special?'SPECIAL':(['G','T','P'].includes(technique)?technique:'G');
    if(kind==='hurt')return 'HURT';
    if(kind==='ko')return 'KO';
    if(kind==='victory')return 'VICTORY';
    throw new RangeError('Unknown tiger action '+kind);
  }
  function smooth(x){const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);}
  function sampleAction(kind,milliseconds,{technique='G',special=false,reducedMotion=false}={}){
    if(!Number.isFinite(milliseconds)||milliseconds<0)throw new TypeError('Invalid tiger action timestamp');
    const key=selectScore(kind,technique,special),frames=SCORES[key];
    const duration=frames[frames.length-1].ms;
    const elapsed=Math.min(milliseconds,duration);
    const complete=elapsed>=duration;
    // Reduced motion is a quiet state change with no sudden camera or root travel.
    if(reducedMotion)return {key,mode:'idle',phase:complete?'complete':'holding',duration,complete,pose:{...ZERO}};
    let i=0;
    while(i+1<frames.length-1&&frames[i+1].ms<=elapsed)i++;
    const a=frames[i],b=frames[Math.min(i+1,frames.length-1)];
    const blend=b.ms===a.ms?1:smooth((elapsed-a.ms)/(b.ms-a.ms));
    const pose={};
    for(const field of FIELDS)pose[field]=a[field]+(b[field]-a[field])*blend;
    const mode=elapsed===duration?frames[frames.length-1].mode:a.mode;
    const phase=key==='HURT'?'recoil':key==='KO'?'collapse':key==='VICTORY'?'celebration':
      mode==='run'?'approach':(elapsed<frames[1].ms?'anticipation':complete?'complete':'contact-recovery');
    return {key,mode,phase,duration,complete,pose};
  }
  return Object.freeze({SCORES,FIELDS,sampleAction,selectScore});
});
