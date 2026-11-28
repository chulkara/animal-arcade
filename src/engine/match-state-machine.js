/* Noah's Arkade — arcade turn flow for the slot reels (pure; no DOM/3D/audio).
 *
 * The reference cabinet runs each exchange as:
 *   TYPE_SPIN   "Set your attack!"  both outer G/T/P reels spin; each player
 *               taps their own button to lock; a 5 s flame timer auto-locks.
 *   NUMBER_SPIN "Attack!"           both inner 10–50 reels spin; same locking.
 *   REVEAL      both locks are shown at once (never before: on one keyboard
 *               the other player must not see your pick), then the existing
 *               combat engine resolves the clash (higher number strikes,
 *               equal numbers reroll the numbers with a tiebreaker charge).
 * Rules/damage stay in src/combat-engine.js; this module only owns who has
 * locked, the timer, what each reel shows and when to commit.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsMatchFlow=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const LIMIT_MS=5000;      // flame countdown (reference: 5)
const STEP_MS=110;        // one reel symbol per 110 ms: too fast to read the other side
const PHASES=Object.freeze(['TYPE_SPIN','NUMBER_SPIN','REVEAL']);
// Per-player reel offsets so the two reels never show the same symbol in step.
const OFFSETS=Object.freeze([0,2]);
// Keyboard: one button per player (the cabinet's single stop button).
const KEYS=Object.freeze({
  p1:Object.freeze(['ShiftLeft','Space','KeyF','KeyG','KeyY']),
  p2:Object.freeze(['ShiftRight','Enter','NumpadEnter','KeyJ'])
});
function playerForKey(code,mode){
  if(KEYS.p1.includes(code))return 0;
  if(mode==='DUEL'&&KEYS.p2.includes(code))return 1;
  return -1;
}
function start({mode='SOLO',phase='TYPE_SPIN',seed=0}={}){
  if(!['SOLO','DUEL'].includes(mode))throw new RangeError('Unknown mode');
  if(phase!=='TYPE_SPIN'&&phase!=='NUMBER_SPIN')throw new RangeError('Spin phases only');
  return Object.freeze({mode,phase,elapsed:0,seed:Math.abs(Math.floor(seed))||0,
    locks:Object.freeze([null,null]),lockedAt:Object.freeze([null,null]),timedOut:false});
}
// Which symbol each player's reel shows at this moment.
function reelIndex(state,player,count){
  if(!count)return 0;
  const locked=state.lockedAt[player];
  const t=locked==null?state.elapsed:locked;
  return (state.seed+OFFSETS[player]+Math.floor(t/STEP_MS))%count;
}
function humans(state){return state.mode==='DUEL'?[0,1]:[0];}
// `values` is one strip for both players, or [strip0, strip1] when a card
// gives one player extra faces.
function stripOf(values,player){return Array.isArray(values?.[0])?values[player]:values;}
function lock(state,player,values){
  if(state.phase==='REVEAL'||!humans(state).includes(player)||state.locks[player]!=null)return state;
  const locks=[...state.locks],lockedAt=[...state.lockedAt];
  const strip=stripOf(values,player);
  locks[player]=strip[reelIndex(state,player,strip.length)];
  lockedAt[player]=state.elapsed;
  return finish({...state,locks:Object.freeze(locks),lockedAt:Object.freeze(lockedAt)});
}
function tick(state,ms,values){
  if(state.phase==='REVEAL')return state;
  let next={...state,elapsed:state.elapsed+Math.max(0,Number(ms)||0)};
  if(next.elapsed>=LIMIT_MS){
    // Time's up: every human still spinning locks on what their reel shows.
    for(const p of humans(next))if(next.locks[p]==null)next=lockRaw(next,p,values);
    next={...next,timedOut:true};
  }
  return finish(next);
}
function lockRaw(state,player,values){
  const locks=[...state.locks],lockedAt=[...state.lockedAt];
  lockedAt[player]=Math.min(state.elapsed,LIMIT_MS);
  const strip=stripOf(values,player);
  locks[player]=strip[reelIndex({...state,lockedAt},player,strip.length)];
  return {...state,locks:Object.freeze(locks),lockedAt:Object.freeze(lockedAt)};
}
function finish(state){
  const done=humans(state).every(p=>state.locks[p]!=null);
  return Object.freeze({...state,ready:done});
}
// What a reel window shows: the live symbol while spinning, a LOCKED shutter
// once that player has locked but the other has not, the value on reveal.
function view(state,player,values){
  values=stripOf(values,player);
  const locked=state.locks[player]!=null;
  if(state.mode==='SOLO'&&player===1)
    return Object.freeze({spinning:!state.ready,shutter:false,value:null,
      index:reelIndex(state,1,values.length)});
  return Object.freeze({spinning:!locked,shutter:locked&&!state.ready,
    value:state.ready?state.locks[player]:null,index:reelIndex(state,player,values.length)});
}
function secondsLeft(state){return Math.max(0,Math.ceil((LIMIT_MS-state.elapsed)/1000));}
// The order the existing engine expects: player one's stop, then player
// two's (DUEL). In SOLO the engine answers for the CPU itself.
function commits(state){
  if(!state.ready)return [];
  return humans(state).map(p=>Object.freeze({player:p,value:state.locks[p]}));
}
return Object.freeze({LIMIT_MS,STEP_MS,PHASES,KEYS,playerForKey,start,lock,tick,view,reelIndex,secondsLeft,commits,stripOf});
});
