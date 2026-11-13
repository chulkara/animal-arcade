import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createMatch}=require('../src/match-session.js');
const {createBattle,BASE_HP}=require('../src/combat-engine.js');

function playDuelBout(session,winner=0){
  for(let steps=0;steps<30;steps++){
    const s=session.getState();
    if(s.phase==='FINISHED')return s;
    if(s.phase==='RESULT'){session.nextRound();continue;}
    if(s.phase==='ATTACK'){session.stop(winner===0?'P':'G');session.stop(winner===0?'G':'P');}
    else{session.stop(winner===0?50:10);session.stop(winner===0?10:50);}
  }
  throw Error('Duel did not finish');
}

function winSoloBout(session){
  for(let n=0;n<30;n++){
    const s=session.getState();
    if(s.phase==='FINISHED')return s;
    if(s.phase==='RESULT'){session.nextRound();continue;}
    if(s.phase==='ATTACK')session.stop('P');
    else session.stop(50);
  }
  throw Error('Solo bout did not finish');
}

test('manual-verified solo expedition needs three wins, with HP carried forward',()=>{
  const values=[0,0.8,0,0,0,0,0,0,0,0,0,0];
  const session=createMatch({mode:'SOLO',rng:()=>values.shift()??0});
  session.stop('G');session.stop(10); // CPU scores a hit first
  assert.equal(session.getState().lastEvent.attacker,1);
  const reducedHp=session.getState().animals[0].hp;
  assert.ok(reducedHp<BASE_HP);
  session.nextRound();
  let first=winSoloBout(session);
  assert.equal(first.session.bout,1);
  assert.equal(first.session.wins[0],1);
  assert.equal(first.session.complete,false);
  session.nextBout();
  assert.equal(session.getState().session.bout,2);
  assert.equal(session.getState().animals[0].hp,reducedHp,'solo HP must not refill after a win');
  assert.equal(session.getState().animals[1].hp,BASE_HP,'next CPU rival starts at full HP');
  assert.throws(()=>session.nextBout(),/Cannot advance/);
});

test('solo progression and reward eligibility happen only at end of three-bout run',()=>{
  const session=createMatch({mode:'SOLO',rng:()=>0});
  for(let bout=1;bout<=3;bout++){
    let s=winSoloBout(session);
    assert.equal(s.session.bout,bout);
    assert.equal(s.session.wins[0],bout);
    if(bout<3){
      assert.equal(s.session.complete,false);
      session.nextBout();
      assert.equal(session.getState().animals[0].hp,BASE_HP);
      assert.equal(session.getState().session.bout,bout+1);
    }else{
      assert.equal(s.session.complete,true);
      assert.equal(s.session.result,'CLEARED');
      assert.throws(()=>session.nextBout(),/Cannot advance/);
    }
  }
  session.reset();
  assert.equal(session.getState().session.wins[0],0);
  assert.equal(session.getState().session.bout,1);
});

test('solo defeat ends the run immediately even before third challenger',()=>{
  const session=createMatch({mode:'SOLO',rng:()=>0.99});
  for(let n=0;n<20;n++){
    const s=session.getState();
    if(s.phase==='FINISHED')break;
    if(s.phase==='RESULT')session.nextRound();
    else if(s.phase==='ATTACK')session.stop('G');
    else session.stop(10);
  }
  const last=session.getState();
  assert.equal(last.session.complete,true);
  assert.equal(last.session.result,'DEFEATED');
  assert.equal(last.session.bout,1);
  assert.throws(()=>session.nextBout(),/Cannot advance/);
});

test('local versus defaults to first to two bout wins and full HP between bouts',()=>{
  const match=createMatch({mode:'DUEL'});
  const b1=playDuelBout(match,0);
  assert.equal(b1.session.wins[0],1);
  assert.equal(b1.session.complete,false);
  match.nextBout();
  assert.deepEqual(match.getState().animals.map(a=>a.hp),[BASE_HP,BASE_HP]);
  const b2=playDuelBout(match,1);
  assert.equal(b2.session.wins[1],1);
  assert.equal(b2.session.complete,false);
  match.nextBout();
  const b3=playDuelBout(match,0);
  assert.equal(b3.session.wins[0],2);
  assert.equal(b3.session.complete,true);
  assert.equal(b3.session.result,'SET_COMPLETE');
  assert.deepEqual(b3.session.wins,[2,1]);
});

test('battle starting health validates exact bounded integers',()=>{
  assert.throws(()=>createBattle({initialHp:[0,BASE_HP]}),/initial HP/);
  assert.throws(()=>createBattle({initialHp:[BASE_HP+1,BASE_HP]}),/initial HP/);
  assert.throws(()=>createBattle({initialHp:[99.5,BASE_HP]}),/initial HP/);
  const battle=createBattle({initialHp:[83,BASE_HP]});
  assert.equal(battle.getState().animals[0].hp,83);
  battle.reset();
  assert.equal(battle.getState().animals[0].hp,83);
});
