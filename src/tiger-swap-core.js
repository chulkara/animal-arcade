/* Deterministic model-swap state for Noah's Arkade. No rendering dependencies. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsTigerSwapCore=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const MODES=Object.freeze(['idle','howl','run']);
  function createTransition(duration=240){
    if(!Number.isFinite(duration)||duration<0)throw new TypeError('Invalid transition duration');
    let from='idle',to='idle',elapsed=duration;
    function snapshot(){
      const t=duration===0?1:Math.min(1,elapsed/duration);
      const eased=t*t*(3-2*t);
      const fromRun=from==='run'?1:0,toRun=to==='run'?1:0;
      const runner=fromRun+(toRun-fromRun)*eased;
      return {from,to,progress:t,heroOpacity:1-runner,runnerOpacity:runner,complete:t===1};
    }
    return {
      set(mode){
        if(!MODES.includes(mode))throw new RangeError('Unknown tiger mode: '+mode);
        if(mode===to)return snapshot();
        // On interruption, transition from the currently dominant model.
        if(elapsed<duration)from=snapshot().progress>=.5?to:from;
        else from=to;
        to=mode;elapsed=0;
        return snapshot();
      },
      advance(milliseconds){
        if(!Number.isFinite(milliseconds)||milliseconds<0)throw new TypeError('Invalid elapsed time');
        elapsed=Math.min(duration,elapsed+milliseconds);
        if(elapsed>=duration)from=to;
        return snapshot();
      },
      get:snapshot,
      reset(){from=to='idle';elapsed=duration;return snapshot();}
    };
  }
  return Object.freeze({MODES,createTransition});
});
