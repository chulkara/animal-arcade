import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const R=require('../src/engine/turn-resolver.js');

const {createPlayer:P,resolveTurn,legalMoves,EVENTS:E}=R;
const C='CHARGE',S='SHIELD';
const A=(tier,miracle=false)=>({type:'ATTACK',tier,miracle});
// Deterministic rng: returns queued values in order, fails loudly if over-used.
const seq=(...values)=>()=>{if(!values.length)throw new Error('rng over-used');return values.shift();};
const none=()=>{throw new Error('rng must not be used');};
const types=r=>r.events.map(e=>e.type);

test('Charge vs Charge: both gain a Point, no randomness',()=>{
 const r=resolveTurn(P(),P(),C,C,{rng:none});
 assert.equal(r.p1.points,1);assert.equal(r.p2.points,1);
 assert.deepEqual(types(r),[E.ANIM_CHARGE,E.ANIM_CHARGE]);
 assert.equal(r.winner,null);
});

test('Charge vs Shield: charger gains, shield just goes up',()=>{
 const r=resolveTurn(P(),P(),C,S,{rng:none});
 assert.equal(r.p1.points,1);assert.equal(r.p2.points,0);
 assert.deepEqual(types(r),[E.ANIM_CHARGE,E.ANIM_SHIELD_UP]);
 assert.equal(r.p2.consecutiveShields,1);
});

test('Charge points cap at the configured maximum',()=>{
 const r=resolveTurn(P({points:5}),P(),C,C,{rng:none});
 assert.equal(r.p1.points,5);
 assert.equal(r.events[0].gained,0);
});

test('Attack beats Charge for full damage; the charger gains nothing',()=>{
 for(const [tier,dmg] of [[1,20],[2,45],[3,80]]){
  const r=resolveTurn(P({points:3}),P(),A(tier),C,{rng:none});
  assert.equal(r.p2.hp,180-dmg);
  assert.equal(r.p2.points,0,'interrupted charge');
  assert.equal(r.p1.points,3-tier,'cost spent');
  const charge=r.events.find(e=>e.type===E.ANIM_CHARGE);
  assert.equal(charge.interrupted,true);assert.equal(charge.gained,0);
  const hit=r.events.at(-1);
  assert.equal(hit.type,E.ANIM_ATTACK_HIT);assert.equal(hit.damage,dmg);assert.equal(hit.player,0);
 }
});

test('Shield blocks Tier 1 and Tier 2 completely; attacker still pays',()=>{
 for(const tier of [1,2]){
  const r=resolveTurn(P({points:2}),P(),A(tier),S,{rng:none});
  assert.equal(r.p2.hp,180);assert.equal(r.p1.points,2-tier);
  assert.deepEqual(types(r),[E.ANIM_SHIELD_BLOCK]);
  assert.equal(r.p2.shieldLockTurns,0);
 }
});

test('Tier 3 vs Shield: 40 chip damage and the Shield shatters for one turn',()=>{
 const r=resolveTurn(P({points:3}),P(),A(3),S,{rng:none});
 assert.equal(r.p2.hp,140);assert.equal(r.p1.points,0);
 assert.deepEqual(types(r),[E.ANIM_SHIELD_SHATTER,E.ANIM_ATTACK_HIT]);
 assert.equal(r.events[1].chip,true);
 assert.equal(r.p2.shieldLockTurns,1);
 assert.equal(legalMoves(r.p2).shield,false);
 assert.equal(legalMoves(r.p2).shieldReason,'SHATTERED');
 assert.throws(()=>resolveTurn(r.p2,r.p1,S,C,{rng:none}),/cannot Shield/);
 // The lock lasts exactly one turn.
 const after=resolveTurn(r.p1,r.p2,C,C,{rng:none});
 assert.equal(after.p2.shieldLockTurns,0);
 assert.equal(legalMoves(after.p2).shield,true);
});

test('Shield Fatigue: two Shields in a row, then Shield is disabled until Charge or Attack',()=>{
 let a=P(),b=P();
 ({p1:a,p2:b}=resolveTurn(a,b,S,C,{rng:none}));
 ({p1:a,p2:b}=resolveTurn(a,b,S,C,{rng:none}));
 assert.equal(a.consecutiveShields,2);
 assert.equal(legalMoves(a).shield,false);
 assert.equal(legalMoves(a).shieldReason,'FATIGUE');
 assert.throws(()=>resolveTurn(a,b,S,C,{rng:none}),/FATIGUE/);
 ({p1:a,p2:b}=resolveTurn(a,b,C,C,{rng:none}));
 assert.equal(a.consecutiveShields,0);
 assert.equal(legalMoves(a).shield,true);
 // Attacking also resets fatigue.
 let c=P({points:1}),d=P();
 ({p1:c,p2:d}=resolveTurn(c,d,S,C,{rng:none}));
 ({p1:c,p2:d}=resolveTurn(c,d,S,C,{rng:none}));
 ({p1:c,p2:d}=resolveTurn(c,d,A(1),C,{rng:none}));
 assert.equal(legalMoves(c).shield,true);
});

test('Attack vs Attack: higher tier wins outright and the loser deals nothing',()=>{
 const r=resolveTurn(P({points:3}),P({points:1}),A(3),A(1),{rng:none});
 assert.equal(r.p2.hp,100);assert.equal(r.p1.hp,180);
 assert.equal(r.p1.points,0);assert.equal(r.p2.points,0,'loser still pays');
 assert.deepEqual(types(r),[E.ANIM_ATTACK_HIT]);
 const mirror=resolveTurn(P({points:1}),P({points:2}),A(1),A(2),{rng:none});
 assert.equal(mirror.p1.hp,135);assert.equal(mirror.events[0].player,1);
});

test('Equal-tier attacks trigger a 50/50 Slot Clash; the winner lands',()=>{
 const left=resolveTurn(P({points:2}),P({points:2}),A(2),A(2),{rng:seq(.49)});
 assert.deepEqual(types(left),[E.SLOT_CLASH,E.ANIM_ATTACK_HIT]);
 assert.equal(left.events[0].winner,0);assert.equal(left.p2.hp,135);assert.equal(left.p1.hp,180);
 const right=resolveTurn(P({points:2}),P({points:2}),A(2),A(2),{rng:seq(.5)});
 assert.equal(right.events[0].winner,1);assert.equal(right.p1.hp,135);
});

test('Miracle eligibility: Tier 3 always, any tier only in Desperation (HP <= 40%)',()=>{
 assert.deepEqual([...legalMoves(P({points:3})).miracleTiers],[3]);
 assert.deepEqual([...legalMoves(P({points:3,hp:72})).miracleTiers],[1,2,3]);
 assert.deepEqual([...legalMoves(P({points:3,hp:73})).miracleTiers],[3]);
 assert.deepEqual([...legalMoves(P({points:1,hp:50})).miracleTiers],[1]);
 assert.throws(()=>resolveTurn(P({points:2}),P(),A(2,true),C,{rng:none}),/Miracle/);
});

test('Miracle success: 100 damage, ignores Shield, no shatter',()=>{
 const r=resolveTurn(P({points:3}),P(),A(3,true),S,{rng:seq(.2)});
 assert.deepEqual(types(r),[E.SLOT_MIRACLE,E.ANIM_MIRACLE_HIT]);
 assert.equal(r.events[0].success,true);
 assert.equal(r.p2.hp,80);assert.equal(r.p2.shieldLockTurns,0);
});

test('Miracle success beats an equal-tier attack without a clash, and a higher tier too',()=>{
 const r=resolveTurn(P({points:3,hp:60}),P({points:3}),A(1,true),A(3),{rng:seq(.1)});
 assert.deepEqual(types(r),[E.SLOT_MIRACLE,E.ANIM_MIRACLE_HIT]);
 assert.equal(r.p2.hp,80);assert.equal(r.p1.hp,60);
 const eq=resolveTurn(P({points:3}),P({points:3}),A(3,true),A(3),{rng:seq(.3)});
 assert.ok(!types(eq).includes(E.SLOT_CLASH));
 assert.equal(eq.p2.hp,80);
});

test('Failed Miracle fizzles: Points spent, nothing lands, the opponent acts freely',()=>{
 const vsShield=resolveTurn(P({points:3}),P(),A(3,true),S,{rng:seq(.34)});
 assert.deepEqual(types(vsShield),[E.SLOT_MIRACLE,E.ANIM_MIRACLE_FIZZLE,E.ANIM_SHIELD_UP]);
 assert.equal(vsShield.p2.hp,180);assert.equal(vsShield.p1.points,0);assert.equal(vsShield.p2.shieldLockTurns,0);
 const vsCharge=resolveTurn(P({points:3}),P(),A(3,true),C,{rng:seq(.9)});
 assert.equal(vsCharge.p2.points,1,'charger is not interrupted');assert.equal(vsCharge.p2.hp,180);
 const vsAttack=resolveTurn(P({points:3}),P({points:1}),A(3,true),A(1),{rng:seq(.9)});
 assert.deepEqual(types(vsAttack),[E.SLOT_MIRACLE,E.ANIM_MIRACLE_FIZZLE,E.ANIM_ATTACK_HIT]);
 assert.equal(vsAttack.p1.hp,160,'the lower-tier attack lands because the Miracle fizzled');
 const both=resolveTurn(P({points:3}),P({points:3}),A(3,true),A(3,true),{rng:seq(.9,.9)});
 assert.equal(both.p1.hp,180);assert.equal(both.p2.hp,180);
});

test('Both Miracles succeed: 50/50 clash for 100 damage; wheels play p1 then p2',()=>{
 const r=resolveTurn(P({points:3}),P({points:3}),A(3,true),A(3,true),{rng:seq(.1,.2,.8)});
 assert.deepEqual(types(r),[E.SLOT_MIRACLE,E.SLOT_MIRACLE,E.SLOT_CLASH,E.ANIM_MIRACLE_HIT]);
 assert.deepEqual(r.events.slice(0,2).map(e=>e.player),[0,1]);
 assert.equal(r.events[2].miracle,true);assert.equal(r.events[2].winner,1);
 assert.equal(r.p1.hp,80);
});

test('One Miracle succeeds, the other fizzles: the success lands',()=>{
 const r=resolveTurn(P({points:3}),P({points:3}),A(3,true),A(3,true),{rng:seq(.9,.1)});
 assert.deepEqual(types(r),[E.SLOT_MIRACLE,E.SLOT_MIRACLE,E.ANIM_MIRACLE_FIZZLE,E.ANIM_MIRACLE_HIT]);
 assert.equal(r.p1.hp,80);
});

test('Knockout sets the winner; HP never drops below zero; KO-ed players cannot act',()=>{
 const r=resolveTurn(P({points:3}),P({hp:30}),A(3),C,{rng:none});
 assert.equal(r.p2.hp,0);assert.equal(r.winner,0);assert.equal(r.events.at(-1).knockout,true);
 assert.throws(()=>resolveTurn(r.p1,r.p2,C,C,{rng:none}),/knocked out/);
});

test('Illegal moves are rejected with a clear reason',()=>{
 assert.throws(()=>resolveTurn(P({points:1}),P(),A(2),C,{rng:none}),/lacks Points/);
 assert.throws(()=>resolveTurn(P(),P(),A(4),C,{rng:none}),/tier/);
 assert.throws(()=>resolveTurn(P(),P(),'DANCE',C,{rng:none}),/Unknown move/);
 assert.throws(()=>resolveTurn(P({points:3}),P({points:3}),A(3,true),C,{rng:()=>1}),/rng/);
});

test('Shield vs Shield does nothing but counts toward fatigue',()=>{
 const r=resolveTurn(P(),P(),S,S,{rng:none});
 assert.deepEqual(types(r),[E.ANIM_SHIELD_UP,E.ANIM_SHIELD_UP]);
 assert.equal(r.p1.consecutiveShields,1);assert.equal(r.p2.consecutiveShields,1);
});

test('Resolver is pure: inputs untouched, outputs frozen, same rng => same result',()=>{
 const a=P({points:3}),b=P({points:3});
 const snapshot=JSON.stringify([a,b]);
 const one=resolveTurn(a,b,A(3,true),A(3),{rng:seq(.5,.4)});
 const two=resolveTurn(a,b,A(3,true),A(3),{rng:seq(.5,.4)});
 assert.equal(JSON.stringify([a,b]),snapshot);
 assert.deepEqual(one,two);
 assert.ok(Object.isFrozen(one.p1)&&Object.isFrozen(one.events)&&Object.isFrozen(one.events[0]));
});

test('A Shattered player shielding on the lock turn is blocked even after fatigue reset',()=>{
 // Shatter on the defender's first Shield; next turn they must Charge or Attack.
 const r=resolveTurn(P({points:3}),P({points:1}),A(3),S,{rng:none});
 const legal=legalMoves(r.p2);
 assert.equal(legal.shield,false);
 assert.deepEqual([...legal.attackTiers],[1]);
});
