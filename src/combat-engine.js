/* Noah's Arkade Phase 3: original, two-reel combat prototype.
 * Inspired by verified arcade interaction (technique -> power -> higher wins).
 * Damage values and creature balancing are ORIGINAL PROTOTYPE VALUES, not
 * claims about Animal Kaiser internals. No proprietary animations/assets. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ArkadeCombatEngine=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const TECHNIQUES=Object.freeze(['G','T','P']);
  const POWERS=Object.freeze([10,20,30,40,50,'MARK']);
  const BASE_HP=180;
  const ATTACK_NAMES=Object.freeze({G:'GUTS',T:'TECHNIQUE',P:'POWER'});
  const BONUS=Object.freeze({G:14,T:8,P:18});
  function assert(value,message){if(!value)throw new Error(message);}
  function selectFrom(source,rng){
    const n=Math.min(0.999999,Math.max(0,Number(rng())||0));
    return source[Math.floor(n*source.length)];
  }
  function createBattle({mode='SOLO',picks=['tiger','lion'],rng=Math.random}={}){
    assert(mode==='SOLO'||mode==='DUEL','Unsupported battle mode');
    assert(Array.isArray(picks)&&picks.length===2&&picks.every(id=>id==='tiger'||id==='lion'),'Choose two valid animals');
    assert(typeof rng==='function','RNG must be a function');
    const original=[...picks];
    let state;
    function reset(){
      state={
        mode,animals:original.map((id,i)=>({id,hp:BASE_HP,maxHp:BASE_HP,player:i+1})),
        round:1,phase:'ATTACK',actor:0,selected:[{technique:null,power:null},{technique:null,power:null}],
        tieCharge:0,lastEvent:null,winner:null,history:[]
      };
      return getState();
    }
    function getState(){return JSON.parse(JSON.stringify(state));}
    function completeAttack(){
      if(mode==='SOLO'&&state.selected[1].technique===null)
        state.selected[1].technique=selectFrom(TECHNIQUES,rng);
      if(state.selected.every(entry=>entry.technique!==null)){
        state.phase='POWER';state.actor=0;
      }
    }
    function completePower(){
      if(mode==='SOLO'&&state.selected[1].power===null)
        state.selected[1].power=selectFrom(POWERS,rng);
      if(state.selected.every(entry=>entry.power!==null))resolve();
    }
    function stop(value){
      if(state.phase==='ATTACK'){
        assert(TECHNIQUES.includes(value),'Attack slot accepts G, T, or P');
        const actor=state.actor;
        assert(state.selected[actor].technique===null,'Attack already stopped');
        state.selected[actor].technique=value;
        if(mode==='DUEL'&&actor===0)state.actor=1;
        completeAttack();
      }else if(state.phase==='POWER'){
        assert(POWERS.includes(value),'Power slot accepts 10-50 or MARK');
        const actor=state.actor;
        assert(state.selected[actor].power===null,'Power already stopped');
        state.selected[actor].power=value;
        if(mode==='DUEL'&&actor===0)state.actor=1;
        completePower();
      }else throw new Error('The slot cannot be stopped during results');
      return getState();
    }
    function rank(v){return v==='MARK'?60:v;}
    function resolve(){
      const p0=rank(state.selected[0].power),p1=rank(state.selected[1].power);
      if(p0===p1){
        state.tieCharge=Math.min(5,state.tieCharge+1);
        state.lastEvent={kind:'TIE',round:state.round,charge:state.tieCharge,
          message:'POWER TIE! REROLL FOR A STRONGER STRIKE.'};
        state.history.push(state.lastEvent);
        state.selected.forEach(entry=>{entry.power=null;});
        state.phase='POWER';state.actor=0;
        return;
      }
      const attacker=p0>p1?0:1,defender=1-attacker;
      const attack=state.selected[attacker];
      const rankValue=rank(attack.power);
      // Purposefully original, lightweight tuning until card and move research is complete.
      const damage=Math.round(18+rankValue*0.5+BONUS[attack.technique]+
        state.tieCharge*12+(attack.power==='MARK'?20:0));
      const victim=state.animals[defender];
      victim.hp=Math.max(0,victim.hp-damage);
      state.winner=victim.hp===0?attacker:null;
      state.phase=state.winner===null?'RESULT':'FINISHED';
      state.lastEvent={
        kind:'HIT',round:state.round,attacker,defender,technique:attack.technique,
        attackName:ATTACK_NAMES[attack.technique],power:attack.power,
        damage,remainingHp:victim.hp,charge:state.tieCharge,
        special:attack.power==='MARK',winner:state.winner
      };
      state.history.push(state.lastEvent);
      if(state.history.length>60)state.history.shift();
    }
    function nextRound(){
      assert(state.phase==='RESULT','Next round is only available after a hit');
      state.round++;
      state.phase='ATTACK';state.actor=0;
      state.tieCharge=0;
      state.selected=[{technique:null,power:null},{technique:null,power:null}];
      state.lastEvent=null;
      return getState();
    }
    reset();
    return Object.freeze({stop,nextRound,reset,getState});
  }
  return Object.freeze({createBattle,TECHNIQUES,POWERS,BASE_HP,ATTACK_NAMES});
});
