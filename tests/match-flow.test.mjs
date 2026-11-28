import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const flow=require('../src/engine/match-state-machine.js');
const TYPES=['G','T','P'],NUMS=[10,20,30,40,50,'MARK'];

test('two players lock in any order and nothing is revealed until both have',()=>{
 let s=flow.start({mode:'DUEL',phase:'TYPE_SPIN'});
 s=flow.tick(s,330,TYPES);
 s=flow.lock(s,1,TYPES);                 // player two first
 assert.equal(s.ready,false);
 assert.equal(flow.view(s,1,TYPES).shutter,true,'P2 sees a LOCKED shutter, not a value');
 assert.equal(flow.view(s,1,TYPES).value,null);
 assert.equal(flow.view(s,0,TYPES).spinning,true);
 const p2=s.locks[1];
 s=flow.tick(s,900,TYPES);
 s=flow.lock(s,1,TYPES);                 // a second tap changes nothing
 assert.equal(s.locks[1],p2);
 s=flow.lock(s,0,TYPES);
 assert.equal(s.ready,true);
 assert.equal(flow.view(s,0,TYPES).value,s.locks[0]);
 assert.equal(flow.view(s,1,TYPES).value,p2);
 assert.deepEqual(flow.commits(s).map(c=>c.player),[0,1],'engine gets P1 then P2');
});

test('the lock takes the symbol the reel shows at that instant, per player',()=>{
 let s=flow.start({mode:'DUEL',phase:'NUMBER_SPIN',seed:3});
 s=flow.tick(s,flow.STEP_MS*4+5,NUMS);
 const shown0=NUMS[flow.reelIndex(s,0,NUMS.length)],shown1=NUMS[flow.reelIndex(s,1,NUMS.length)];
 assert.notEqual(shown0,shown1,'the two reels are out of step');
 s=flow.lock(s,0,NUMS);
 assert.equal(s.locks[0],shown0);
 s=flow.tick(s,1000,NUMS);
 assert.equal(flow.reelIndex(s,0,NUMS.length),NUMS.indexOf(shown0),'a locked reel stays put');
});

test('the 5-second flame timer auto-locks whoever is still spinning',()=>{
 let s=flow.start({mode:'DUEL',phase:'TYPE_SPIN'});
 s=flow.lock(flow.tick(s,1200,TYPES),0,TYPES);
 assert.equal(flow.secondsLeft(s),4);
 s=flow.tick(s,flow.LIMIT_MS,TYPES);
 assert.equal(s.ready,true);
 assert.equal(s.timedOut,true);
 assert.ok(TYPES.includes(s.locks[1]));
});

test('solo: only player one locks; the CPU reel spins until the reveal and the engine picks for it',()=>{
 let s=flow.start({mode:'SOLO',phase:'TYPE_SPIN'});
 assert.equal(flow.lock(s,1,TYPES),s,'the CPU slot ignores input');
 assert.equal(flow.view(s,1,TYPES).spinning,true);
 s=flow.lock(flow.tick(s,250,TYPES),0,TYPES);
 assert.equal(s.ready,true);
 assert.deepEqual(flow.commits(s).map(c=>c.player),[0]);
});

test('one keyboard, one button each: left side is P1, right side is P2 (P2 keys inert in solo)',()=>{
 assert.equal(flow.playerForKey('ShiftLeft','DUEL'),0);
 assert.equal(flow.playerForKey('Space','DUEL'),0);
 assert.equal(flow.playerForKey('ShiftRight','DUEL'),1);
 assert.equal(flow.playerForKey('KeyJ','DUEL'),1);
 assert.equal(flow.playerForKey('KeyJ','SOLO'),-1);
 assert.equal(flow.playerForKey('KeyQ','DUEL'),-1);
});
