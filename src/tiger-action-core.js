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
  const FIELDS=Object.freeze(['travel','lift','pitch','roll','neck','head','headYaw','jaw','foreleg','tail']);
  const ZERO=Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,0])));
  const k=(ms,mode,values={})=>Object.freeze({ms,mode,...ZERO,...values});
  // Stage-distance is in THREE scene units. Rotations are small radians:
  // deliberately bounded until real quadruped pose clips pass visual review.
  const SCORES=Object.freeze({
    // User-approved base poses remain on ONE high-detail Tiger skeleton.
    // Do not swap to the lower-poly Run model within an attack.
    G:Object.freeze([
      k(0,'idle'),
      k(155,'idle',{travel:-.06,lift:-.045,pitch:.09,head:.055,foreleg:-.18}),
      k(320,'idle',{travel:.09,lift:.015,pitch:-.035,foreleg:.54,neck:-.055}),
      k(570,'idle',{travel:.35,lift:.10,pitch:-.14,head:-.10,foreleg:1.46,jaw:.16,roll:.035}),
      k(710,'idle',{travel:.40,lift:.04,pitch:-.065,foreleg:.90,head:-.08}),
      k(930,'idle',{travel:.15,lift:0,foreleg:.12,head:-.025}),
      k(1170,'idle')
    ]),
    T:Object.freeze([
      k(0,'idle'),
      k(110,'idle',{travel:-.05,lift:-.08,pitch:.12,head:.05,foreleg:-.20}),
      k(240,'idle',{travel:.12,lift:.13,pitch:-.065,foreleg:.46,head:-.04}),
      k(490,'idle',{travel:.40,lift:.20,pitch:-.10,roll:.08,foreleg:1.75,head:-.14}),
      k(615,'idle',{travel:.42,lift:.085,pitch:.04,roll:.04,foreleg:1.05}),
      k(800,'idle',{travel:.19,lift:0,foreleg:.12}),
      k(1030,'idle')
    ]),
    P:Object.freeze([
      k(0,'idle'),
      k(250,'idle',{travel:-.10,lift:-.065,pitch:.12,neck:.08,head:.09,foreleg:-.22,jaw:.07}),
      k(470,'idle',{travel:.04,lift:.055,pitch:-.04,foreleg:.44,jaw:.14}),
      k(765,'idle',{travel:.42,lift:.12,pitch:-.20,neck:-.16,head:-.12,foreleg:1.50,jaw:.37}),
      k(930,'idle',{travel:.39,lift:.05,pitch:-.105,foreleg:.95,jaw:.16}),
      k(1200,'idle',{travel:.16,lift:0,foreleg:.1}),
      k(1510,'idle')
    ]),
    SPECIAL:Object.freeze([
      k(0,'howl'),
      k(330,'howl',{lift:.055,pitch:.035,head:-.045,jaw:.20,neck:-.035}),
      k(505,'howl',{lift:.045,head:-.045,jaw:.15,travel:-.06}),
      k(675,'idle',{travel:-.085,lift:-.07,pitch:.10,head:.025,foreleg:-.15}),
      k(935,'idle',{travel:.14,lift:.09,pitch:-.06,foreleg:.42,jaw:.12}),
      k(1190,'idle',{travel:.44,lift:.15,pitch:-.16,foreleg:1.60,head:-.13,neck:-.10,jaw:.42}),
      k(1390,'idle',{travel:.38,lift:.07,foreleg:.90,jaw:.19}),
      k(1640,'idle',{travel:.15,foreleg:.13}),
      k(1920,'idle')
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
    VICTORY:Object.freeze([
      k(0,'idle'),
      k(350,'idle',{lift:.028,pitch:-.015,head:-.02,neck:-.015,jaw:.04}),
      k(720,'idle',{lift:.043,pitch:-.026,head:-.045,neck:-.02,jaw:.07}),
      k(1200,'idle',{lift:.025,head:-.025,jaw:.025}),
      k(1680,'idle')
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
