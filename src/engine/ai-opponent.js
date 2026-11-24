/* Noah's Arkade combat rules v2 — CPU opponent.
 * Pure: reads only what a player could see (HP, Points, Shield fatigue and
 * locks, Desperation) and returns one legal move. It never peeks at the
 * human's chosen move or at future rng rolls.
 *
 * Method: predict how likely the human is to pick each move from the visible
 * state, simulate every (cpu move × human move) pair with the real turn
 * resolver — enumerating Miracle/Clash wheel outcomes with their true odds —
 * and score the expected result. Difficulty sets how sharply it prefers the
 * best-scoring move. Examples of reads this produces: when the CPU holds 3
 * Points the human is expected to Shield, so the CPU Charges or uses the
 * Tier 3 Shield Breaker; when the human holds 3 Points the CPU respects the
 * heavy attack. */
(function(root,factory){
  const resolver=typeof module==='object'&&module.exports?
    require('./turn-resolver.js'):root.ArkadeTurnResolver;
  const api=factory(resolver);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ArkadeAiOpponent=api;
})(typeof window!=='undefined'?window:null,function(R){
  'use strict';
  const DIFFICULTY=Object.freeze({easy:28,normal:9,hard:2.5}); // softmax temperature
  const VALUE=Object.freeze({point:12,knockout:400,takenWeight:1.1,shattered:10});

  function candidateMoves(player){
    const legal=R.legalMoves(player),out=[{type:'CHARGE'}];
    if(legal.shield)out.push({type:'SHIELD'});
    for(const tier of legal.attackTiers){
      out.push({type:'ATTACK',tier,miracle:false});
      if(legal.miracleTiers.includes(tier))out.push({type:'ATTACK',tier,miracle:true});
    }
    return out;
  }
  // How a human tends to play given what they can see. Weights, not rules.
  function predictHuman(human,cpu){
    const moves=candidateMoves(human);
    const maxTier=Math.max(0,...R.legalMoves(human).attackTiers);
    const weights=moves.map(m=>{
      if(m.type==='CHARGE')return 1+(human.points===0?1:0)+(cpu.points===0?.6:0);
      if(m.type==='SHIELD')return .5+(cpu.points>=3?1.3:cpu.points===2?.6:0);
      let w=.45+(m.tier===maxTier?.7:0)+(cpu.hp<=R.RULES.tiers[m.tier].damage?1.5:0);
      if(m.miracle)w*=.8;
      return w;
    });
    const total=weights.reduce((a,b)=>a+b,0);
    return moves.map((move,i)=>({move,p:weights[i]/total}));
  }
  // Every distinct wheel outcome of one turn, with its probability.
  function outcomes(cpu,human,cpuMove,humanMove){
    const results=[];
    const STOP={};
    const explore=prefix=>{
      let used=0;
      const rng=()=>{if(used<prefix.length)return prefix[used++];throw STOP;};
      let result;
      try{result=R.resolveTurn(cpu,human,cpuMove,humanMove,{rng});}
      catch(error){
        if(error!==STOP)throw error;
        explore([...prefix,0]);explore([...prefix,.999999]);return;
      }
      let p=1;
      for(const e of result.events){
        if(e.type===R.EVENTS.SLOT_MIRACLE)p*=e.success?R.RULES.miracleOdds:1-R.RULES.miracleOdds;
        if(e.type===R.EVENTS.SLOT_CLASH)p*=R.RULES.clashOdds;
      }
      results.push({p,result});
    };
    explore([]);
    return results;
  }
  function score(cpu,human,result){
    const dealt=human.hp-result.p2.hp,taken=cpu.hp-result.p1.hp;
    let s=dealt-VALUE.takenWeight*taken+VALUE.point*(result.p1.points-cpu.points);
    if(result.winner===0)s+=VALUE.knockout;
    if(result.winner===1)s-=VALUE.knockout;
    if(result.p1.shieldLockTurns>0)s-=VALUE.shattered;
    return s;
  }
  function evaluate(cpu,human){
    const model=predictHuman(human,cpu);
    return candidateMoves(cpu).map(move=>{
      let expected=0;
      for(const {move:humanMove,p} of model)
        for(const o of outcomes(cpu,human,move,humanMove))expected+=p*o.p*score(cpu,human,o.result);
      return {move,expected};
    });
  }
  function chooseMove(cpu,human,options={}){
    const rng=options.rng||Math.random;
    const temperature=DIFFICULTY[options.difficulty||'normal'];
    if(!temperature)throw new RangeError('Unknown difficulty');
    const scored=evaluate(cpu,human);
    const best=Math.max(...scored.map(s=>s.expected));
    const weights=scored.map(s=>Math.exp((s.expected-best)/temperature));
    const total=weights.reduce((a,b)=>a+b,0);
    let pick=Number(rng())*total,index=0;
    while(index<weights.length-1&&pick>=weights[index]){pick-=weights[index];index++;}
    return Object.freeze({move:Object.freeze({...scored[index].move}),
      considered:Object.freeze(scored.map((s,i)=>Object.freeze({...s,p:weights[i]/total})))});
  }
  return Object.freeze({DIFFICULTY,chooseMove,evaluate,predictHuman,candidateMoves});
});
