/* Original procedural combat motion scores for the Tiger (no copyrighted moves).
 * Time-domain choreography, independent of framerate, DOM and renderer.
 * Native Idle/Howl/Run previews are preserved; attacks stay on the hero rig.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsTigerActionCore=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const FIELDS=Object.freeze(['travel','lateral','lift','pitch','rear','yaw','roll','neck','head','headYaw','jaw','foreleg','forelegRight','sweep','shoulder','hindleg','tail']);
  const ZERO=Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,0])));
  const k=(ms,mode,values={})=>Object.freeze({ms,mode,...ZERO,...values});
  // Stage-distance is in THREE scene units. Rotations are small radians:
  // deliberately bounded until real quadruped pose clips pass visual review.
  const SCORES=Object.freeze({
    // User-approved base poses remain on ONE high-detail Tiger skeleton.
    // Do not swap to the lower-poly Run model within an attack.
    // G = shoulder-first charge; T = lateral single-paw cross-claw;
    // P = upright two-paw hammer; SPECIAL = howl into airborne pounce.
    // One high-detail hero skeleton throughout attacks, no Run mesh swap.
    G:Object.freeze([
      k(0,'idle'),
      k(190,'idle',{travel:-.12,lift:-.09,pitch:.16,head:.24,neck:.14,shoulder:.12,foreleg:-.20,forelegRight:-.20}),
      k(320,'idle',{travel:-.07,lift:-.07,pitch:.19,head:.25,neck:.16,shoulder:.16}),
      k(650,'idle',{travel:.50,lift:.055,pitch:.22,head:.32,neck:.24,shoulder:.27,foreleg:-.28,forelegRight:-.28,tail:-.30}),
      k(800,'idle',{travel:.54,lift:.015,pitch:.16,head:.22,shoulder:.14}),
      k(1030,'idle',{travel:.22,lift:.015,pitch:.04,head:.06}),
      k(1320,'idle')
    ]),
    T:Object.freeze([
      k(0,'idle'),
      k(135,'idle',{lateral:-.09,lift:-.055,yaw:-.10,roll:-.09,foreleg:-.22}),
      k(295,'idle',{lateral:-.30,travel:.10,lift:.06,yaw:-.30,roll:-.12,foreleg:.45,sweep:-.65}),
      k(515,'idle',{lateral:-.10,travel:.31,lift:.12,yaw:.28,roll:.17,foreleg:1.95,forelegRight:-.16,sweep:1.22,headYaw:.28,tail:.24}),
      k(680,'idle',{lateral:.15,travel:.35,lift:.055,yaw:.36,roll:.12,foreleg:1.12,sweep:.60}),
      k(880,'idle',{lateral:.06,travel:.16,lift:0,yaw:.10,roll:.035,foreleg:.14,sweep:.08}),
      k(1110,'idle')
    ]),
    P:Object.freeze([
      k(0,'idle'),
      k(300,'idle',{travel:-.12,lift:-.055,pitch:-.10,rear:.40,head:-.06,foreleg:.65,forelegRight:.65}),
      k(600,'idle',{travel:-.09,lift:.37,pitch:-.16,rear:1.03,head:-.12,foreleg:1.70,forelegRight:1.70,shoulder:-.08}),
      k(790,'idle',{travel:.13,lift:.44,pitch:-.09,rear:.70,foreleg:1.90,forelegRight:1.90}),
      k(990,'idle',{travel:.37,lift:.015,pitch:.23,rear:-.04,head:.22,foreleg:.25,forelegRight:.25,shoulder:.10,jaw:.22}),
      k(1210,'idle',{travel:.23,lift:0,pitch:.08,foreleg:.08,forelegRight:.08}),
      k(1580,'idle')
    ]),
    SPECIAL:Object.freeze([
      k(0,'howl'),
      k(330,'howl',{lift:.04,head:-.025,jaw:.08}),
      k(540,'howl',{lift:.055,head:-.04,neck:-.025}),
      k(730,'idle',{travel:-.11,lift:-.095,pitch:.14,foreleg:-.25,forelegRight:-.25}),
      k(980,'idle',{travel:.10,lift:.28,pitch:-.14,rear:.37,foreleg:.95,forelegRight:.95,tail:.40}),
      k(1190,'idle',{travel:.40,lift:.58,pitch:-.12,rear:.20,foreleg:1.55,forelegRight:1.55,jaw:.32,tail:.50}),
      k(1390,'idle',{travel:.60,lift:.30,pitch:.14,rear:-.12,foreleg:1.44,forelegRight:1.44,jaw:.38}),
      k(1580,'idle',{travel:.58,lift:.005,pitch:.20,foreleg:.32,forelegRight:.32,head:.17}),
      k(1820,'idle',{travel:.28,lift:0,pitch:.04,foreleg:.06,forelegRight:.06}),
      k(2130,'idle')
    ]),
    HURT:Object.freeze([
      k(0,'idle'),k(115,'idle',{travel:-.14,lift:.10,pitch:-.10,head:.33,neck:.22,roll:.12,jaw:.08}),
      k(260,'idle',{travel:-.24,lift:.08,pitch:.10,head:.33,roll:-.14}),
      k(520,'idle',{travel:-.11,head:-.05}),k(860,'idle')
    ]),
    KO:Object.freeze([
      k(0,'idle'),k(180,'idle',{travel:-.14,lift:.10,head:.23,roll:.10}),
      k(580,'idle',{travel:-.23,lift:.30,pitch:.25,roll:1.20,head:.35,jaw:.08}),
      k(1100,'idle',{travel:-.30,lift:.43,pitch:.20,roll:2.30,head:.40}),
      k(1600,'idle',{travel:-.30,lift:.43,pitch:.20,roll:2.30,head:.40})
    ]),
    // Calm victory stance: do not play native Howl, whose head arcs too far back.
    // The user likes native Howl. Victory is exactly that clip,
    // without the extra head/neck rotation added in V2.
    VICTORY:Object.freeze([
      k(0,'howl'),k(550,'howl'),k(1400,'howl'),k(2150,'howl'),
      k(2600,'idle')
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
    const t=b.ms===a.ms?1:Math.min(1,(elapsed-a.ms)/(b.ms-a.ms));
    const isProtected=key==='HURT'||key==='KO';
    // PCHIP / monotone cubic-Hermite: velocity stays continuous across
    // attack beats instead of stopping at each smoothstep keyframe.
    // Accepted HURT and KO keep their ORIGINAL timing/interpolation exactly.
    function slope(index,field){
      if(index<=0||index>=frames.length-1)return 0;
      const prev=frames[index-1],cur=frames[index],next=frames[index+1];
      const h0=cur.ms-prev.ms,h1=next.ms-cur.ms;
      const d0=(cur[field]-prev[field])/h0,d1=(next[field]-cur[field])/h1;
      if(d0*d1<=0)return 0;
      const w0=2*h1+h0,w1=h1+2*h0;
      return (w0+w1)/(w0/d0+w1/d1);
    }
    const pose={};
    for(const field of FIELDS){
      if(isProtected){pose[field]=a[field]+(b[field]-a[field])*blend;continue;}
      const width=b.ms-a.ms;
      const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t;
      const h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
      const value=h00*a[field]+h10*width*slope(i,field)+
        h01*b[field]+h11*width*slope(i+1,field);
      pose[field]=Math.max(Math.min(a[field],b[field]),
        Math.min(Math.max(a[field],b[field]),value));
    }
    const mode=elapsed===duration?frames[frames.length-1].mode:a.mode;
    const phase=key==='HURT'?'recoil':key==='KO'?'collapse':key==='VICTORY'?'celebration':
      (elapsed<frames[1].ms?'anticipation':complete?'complete':'strike-recovery');
    return {key,mode,phase,duration,complete,pose};
  }
  return Object.freeze({SCORES,FIELDS,sampleAction,selectScore});
});
