import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {createBattle,TECHNIQUES,POWERS,BASE_HP}=require('../src/combat-engine.js');

test('solo attack and power slots resolve CPU response and real damage',()=>{
  const b=createBattle({mode:'SOLO',picks:['tiger','lion'],rng:()=>0});
  assert.equal(b.getState().phase,'ATTACK');
  b.stop('P');
  assert.equal(b.getState().phase,'POWER');
  assert.equal(b.getState().selected[1].technique,'G');
  const result=b.stop(50);
  assert.equal(result.phase,'RESULT');
  assert.equal(result.lastEvent.kind,'HIT');
  assert.equal(result.lastEvent.attacker,0);
  assert.equal(result.lastEvent.defender,1);
  assert.ok(result.lastEvent.damage>0);
  assert.ok(result.animals[1].hp<BASE_HP);
  assert.equal(result.animals[0].hp,BASE_HP);
});

test('local two-player requires a green and yellow stop per player',()=>{
  const b=createBattle({mode:'DUEL',picks:['lion','tiger']});
  b.stop('G');
  assert.equal(b.getState().phase,'ATTACK');
  assert.equal(b.getState().actor,1);
  b.stop('T');
  assert.equal(b.getState().phase,'POWER');
  assert.equal(b.getState().actor,0);
  b.stop(40);
  assert.equal(b.getState().actor,1);
  b.stop(10);
  assert.equal(b.getState().phase,'RESULT');
  assert.equal(b.getState().lastEvent.attacker,0);
  const remaining=b.getState().animals[1].hp;
  b.nextRound();
  assert.equal(b.getState().round,2);
  assert.equal(b.getState().phase,'ATTACK');
  assert.equal(b.getState().animals[1].hp,remaining);
  assert.equal(b.getState().selected[0].technique,null);
});

test('power ties reroll without damage and add tiebreaker charge',()=>{
  const b=createBattle({mode:'DUEL',picks:['tiger','lion']});
  b.stop('T');b.stop('P');
  b.stop(20);b.stop(20);
  let s=b.getState();
  assert.equal(s.phase,'POWER');
  assert.equal(s.tieCharge,1);
  assert.equal(s.lastEvent.kind,'TIE');
  assert.deepEqual(s.animals.map(f=>f.hp),[BASE_HP,BASE_HP]);
  assert.equal(s.selected[0].power,null);
  b.stop('MARK');b.stop(40);
  s=b.getState();
  assert.equal(s.phase,'RESULT');
  assert.equal(s.lastEvent.special,true);
  assert.equal(s.lastEvent.attacker,0);
  assert.equal(s.lastEvent.charge,1);
});

test('higher numbered power wins; special fighting mark outranks 50',()=>{
  const b=createBattle({mode:'DUEL',picks:['tiger','tiger']});
  b.stop('P');b.stop('G');
  b.stop(50);b.stop('MARK');
  assert.equal(b.getState().lastEvent.attacker,1);
});

test('knockout ends the match, prevents extra input and rematch resets HP',()=>{
  const b=createBattle({mode:'DUEL',picks:['tiger','lion']});
  for(let n=0;n<10;n++){
    const s=b.getState();
    if(s.phase==='FINISHED')break;
    b.stop('P');b.stop('G');b.stop(50);b.stop(10);
    if(b.getState().phase==='RESULT')b.nextRound();
  }
  assert.equal(b.getState().phase,'FINISHED');
  assert.equal(b.getState().winner,0);
  assert.equal(b.getState().animals[1].hp,0);
  assert.throws(()=>b.stop('G'),/cannot be stopped/);
  assert.throws(()=>b.nextRound(),/only available/);
  b.reset();
  assert.equal(b.getState().phase,'ATTACK');
  assert.equal(b.getState().round,1);
  assert.deepEqual(b.getState().animals.map(f=>f.hp),[BASE_HP,BASE_HP]);
});

test('valid slot inputs are strictly checked, state cannot be mutated externally',()=>{
  assert.deepEqual(TECHNIQUES,['G','T','P']);
  assert.deepEqual(POWERS,[10,20,30,40,50,'MARK']);
  const b=createBattle();
  assert.throws(()=>b.stop(10),/G, T, or P/);
  const snapshot=b.getState();
  snapshot.animals[0].hp=0;
  assert.equal(b.getState().animals[0].hp,BASE_HP);
});

test('combat is wired after the prototype and preserves the approved painting',()=>{
  const html=readFileSync('index.html','utf8');
  const app=readFileSync('src/app.js','utf8');
  const proto=readFileSync('src/prototype.js','utf8');
  const ui=readFileSync('src/combat-ui.js','utf8');
  assert.ok(html.indexOf('src/combat-engine.js')>html.indexOf('src/prototype.js'));
  assert.ok(html.indexOf('src/combat-ui.js')>html.indexOf('src/combat-engine.js'));
  assert.ok(html.includes('src/combat.css'));
  assert.ok(app.includes("screen==='BATTLE_PLAY'?window.NoahsCombat.render()"));
  assert.ok(proto.includes('data-prototype-fight'));
  assert.ok(ui.includes("arkade:screenchange"));
  assert.ok(readFileSync('src/painted-menu.js','utf8').includes("const ART='./assets/approved-menu.png'"));
});
