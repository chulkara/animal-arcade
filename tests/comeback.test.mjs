import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const E=require('../src/combat-engine.js');

// DUEL so both picks are scripted; P1 always wins the power reel 50 vs 10.
function exchange(b,technique,power=50,loser=10){
  b.stop(technique);b.stop('G');b.stop(power);b.stop(loser);return b.getState();
}

test('hits split a strike into 1/2/3 blows that sum exactly to its damage',()=>{
  for(const [t,n] of [['G',1],['T',2],['P',3]]){
    const s=exchange(E.createBattle({mode:'DUEL'}),t);
    assert.equal(s.lastEvent.hits.length,n,t);
    assert.equal(s.lastEvent.hits.reduce((a,b)=>a+b,0),s.lastEvent.damage,t);
  }
  assert.deepEqual(E.splitHits(77,'T'),[35,42]);
  assert.equal(E.splitHits(91,'P').reduce((a,b)=>a+b,0),91);
});

test('Focus Guard: first heavy hit at or below half health is cut by 35%, once per bout',()=>{
  const b=E.createBattle({mode:'DUEL',initialHp:[180,90]});
  let s=exchange(b,'P');
  assert.equal(s.lastEvent.focusGuard,true);
  assert.equal(s.lastEvent.damage,Math.round(s.lastEvent.rawDamage*(1-E.FOCUS_CUT)));
  assert.equal(s.lastEvent.guarded,s.lastEvent.rawDamage-s.lastEvent.damage);
  assert.equal(s.lastEvent.hpBefore,90);
  b.nextRound();s=exchange(b,'P');
  assert.equal(s.lastEvent.focusGuard,false,'only once per bout');
  // a light hit never triggers it, and neither does a healthy defender
  const light=exchange(E.createBattle({mode:'DUEL',initialHp:[180,80]}),'T',20);
  assert.equal(light.lastEvent.focusGuard,false);
  const healthy=exchange(E.createBattle({mode:'DUEL'}),'P');
  assert.equal(healthy.lastEvent.focusGuard,false);
});

test('Resurrection: a lethal hit leaves the animal on 25% once per bout, then it can fall',()=>{
  const b=E.createBattle({mode:'DUEL',initialHp:[180,10]});
  let s=exchange(b,'G');
  assert.equal(s.lastEvent.resurrected,true);
  assert.equal(s.animals[1].hp,Math.round(E.BASE_HP*E.REVIVE_SHARE));
  assert.equal(s.phase,'RESULT');assert.equal(s.winner,null);
  assert.equal(s.lastEvent.hpBefore,10);
  b.nextRound();
  while(b.getState().phase==='RESULT'||b.getState().phase==='ATTACK'){
    if(b.getState().phase==='RESULT')b.nextRound();
    s=exchange(b,'P');
    assert.equal(s.lastEvent.resurrected,false);
  }
  assert.equal(s.phase,'FINISHED');assert.equal(s.winner,0);
});

test('✦ hits are a Gold Change; a ✦ that wins the bout is a Super Miracle',()=>{
  const hit=exchange(E.createBattle({mode:'DUEL'}),'P','MARK');
  assert.equal(hit.lastEvent.goldChange,true);assert.equal(hit.lastEvent.superMiracle,false);
  assert.equal(hit.lastEvent.hits.length,3);
  const b=E.createBattle({mode:'DUEL',initialHp:[180,30]});
  exchange(b,'G');                 // uses the Resurrection (30 → 45)
  b.nextRound();
  const fin=exchange(b,'P','MARK');
  assert.equal(fin.phase,'FINISHED');
  assert.equal(fin.lastEvent.superMiracle,true);
  const plain=exchange(E.createBattle({mode:'DUEL'}),'P',50);
  assert.equal(plain.lastEvent.goldChange,false);
});
