import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const R=require('../src/engine/turn-resolver.js');
const AI=require('../src/engine/ai-opponent.js');
const P=R.createPlayer;
const best=(cpu,human)=>{
  const s=AI.evaluate(cpu,human);
  return s.reduce((a,b)=>b.expected>a.expected?b:a).move;
};
const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};

test('always returns a legal move across many random states and difficulties',()=>{
  const rng=mulberry(7);
  for(let i=0;i<400;i++){
    const mk=()=>P({hp:1+Math.floor(rng()*180),points:Math.floor(rng()*6),
      consecutiveShields:Math.floor(rng()*3),shieldLockTurns:rng()<.2?1:0});
    const cpu=mk(),human=mk();
    for(const difficulty of ['easy','normal','hard']){
      const {move}=AI.chooseMove(cpu,human,{rng,difficulty});
      assert.doesNotThrow(()=>R.resolveTurn(cpu,human,move,'CHARGE',{rng:()=>.5}));
    }
  }
});

test('takes a guaranteed knockout',()=>{
  // Human has 0 Points so cannot attack; any tier that lands KOs a 15-HP human,
  // but Shield could block T1/T2 — the AI should still attack (Shield is the only out).
  const m=best(P({points:3}),P({hp:15,points:0}));
  assert.equal(m.type,'ATTACK');
});

test('never Shields against a human who has no Points to attack with',()=>{
  for(const cpuPoints of [0,1,2,3]){
    const m=best(P({points:cpuPoints}),P({points:0}));
    assert.notEqual(m.type,'SHIELD');
  }
});

test('respects a human holding 3 Points when it cannot fight back',()=>{
  const m=best(P({points:0}),P({points:3}));
  assert.equal(m.type,'SHIELD','shield takes 40 chip at worst instead of 80');
});

test('with 3 Points and a human expected to Shield, uses the Tier 3 breaker or keeps charging, never T1/T2 into a Shield',()=>{
  const m=best(P({points:3}),P({points:0}));
  assert.ok(m.type==='CHARGE'||(m.type==='ATTACK'&&m.tier===3),JSON.stringify(m));
});

test('hard is sharper than easy: picks the best move more often',()=>{
  const cpu=P({points:0}),human=P({points:3});
  const share=difficulty=>{
    const rng=mulberry(3);let hits=0;
    for(let i=0;i<300;i++)if(AI.chooseMove(cpu,human,{rng,difficulty}).move.type==='SHIELD')hits++;
    return hits/300;
  };
  assert.ok(share('hard')>share('easy'));
  assert.ok(share('hard')>.8);
});

test('is deterministic for a given rng and never mutates inputs',()=>{
  const cpu=P({points:2,hp:60}),human=P({points:2});
  const snap=JSON.stringify([cpu,human]);
  const a=AI.chooseMove(cpu,human,{rng:mulberry(11)});
  const b=AI.chooseMove(cpu,human,{rng:mulberry(11)});
  assert.deepEqual(a.move,b.move);
  assert.equal(JSON.stringify([cpu,human]),snap);
  const total=a.considered.reduce((s,c)=>s+c.p,0);
  assert.ok(Math.abs(total-1)<1e-9);
});

test('human model only proposes legal moves and sums to 1',()=>{
  const human=P({points:1,consecutiveShields:2});
  const model=AI.predictHuman(human,P());
  assert.ok(model.every(m=>m.move.type!=='SHIELD'));
  assert.ok(Math.abs(model.reduce((s,m)=>s+m.p,0)-1)<1e-9);
});
