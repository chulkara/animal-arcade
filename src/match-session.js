/* Phase 4.5 match coordinator.
 * Verified flow from Animal Kaiser Plus 2024 operation manual sections
 * 5-2-2 and 5-2-3: three consecutive solo victories with player HP carry,
 * local two-player versus until one side wins twice.
 * Damage, animal roster, and CPU probability remain original prototypes. */
(function(root,factory){
  const engine=typeof module==='object'&&module.exports?
    require('./combat-engine.js'):root?.ArkadeCombatEngine;
  const api=factory(engine);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ArkadeMatch=api;
})(typeof window!=='undefined'?window:null,function(engine){
  'use strict';
  if(!engine?.createBattle)throw Error('Combat engine must load before match coordinator');
  function createMatch({mode='SOLO',picks=['tiger','lion'],modifiers=[],rng=Math.random}={}){
    if(!['SOLO','DUEL'].includes(mode))throw Error('Invalid match mode');
    if(!Array.isArray(picks)||picks.length!==2)throw Error('Match requires two animals');
    const target=mode==='SOLO'?3:2;
    const originalPicks=[...picks],originalModifiers=[...modifiers];
    let battle,bout,wins,complete,processed;
    function newBout(startingHp=[engine.BASE_HP,engine.BASE_HP]){
      battle=engine.createBattle({
        mode,picks:originalPicks,modifiers:originalModifiers,
        rng,initialHp:startingHp
      });
      processed=false;
    }
    function reset(){
      wins=[0,0];bout=1;complete=false;
      newBout();
      return getState();
    }
    function getState(){
      const battleState=battle.getState();
      const winner=battleState.phase==='FINISHED'?battleState.winner:null;
      return {...battleState,session:{
        mode,bout,goal:target,wins:[...wins],complete,
        result:complete?
          (mode==='SOLO'?(wins[0]>=target?'CLEARED':'DEFEATED'):'SET_COMPLETE'):
          (winner!==null?'BOUT_COMPLETE':'IN_PROGRESS')
      }};
    }
    function stop(value){
      const before=battle.getState();
      const result=battle.stop(value);
      if(!processed&&before.phase!=='FINISHED'&&result.phase==='FINISHED'){
        processed=true;
        wins[result.winner]++;
        complete=mode==='SOLO'?
          (result.winner===1||wins[0]>=target):
          wins.some(n=>n>=target);
      }
      return getState();
    }
    function nextRound(){battle.nextRound();return getState();}
    function nextBout(){
      const current=battle.getState();
      if(current.phase!=='FINISHED'||!processed||complete)
        throw new Error('Cannot advance until a non-final bout finishes');
      const hp=mode==='SOLO'?
        [current.animals[0].hp,engine.BASE_HP]:
        [engine.BASE_HP,engine.BASE_HP];
      if(hp[0]<=0)throw new Error('Cannot continue from a defeated animal');
      bout++;newBout(hp);
      return getState();
    }
    reset();
    return Object.freeze({stop,nextRound,nextBout,reset,getState});
  }
  return Object.freeze({createMatch});
});
