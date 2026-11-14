import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createTransition}=require('../src/tiger-swap-core.js');

test('starts in high-detail idle, no running model visible',()=>{
 const t=createTransition(200);
 assert.equal(t.get().heroOpacity,1);
 assert.equal(t.get().runnerOpacity,0);
});
test('crossfades idle to native running tiger smoothly and reversibly',()=>{
 const t=createTransition(200);
 t.set('run');
 assert.equal(t.get().runnerOpacity,0);
 assert.equal(t.advance(100).runnerOpacity,.5);
 assert.equal(t.advance(100).runnerOpacity,1);
 t.set('idle');
 assert.equal(t.advance(100).heroOpacity,.5);
 assert.equal(t.advance(100).heroOpacity,1);
});
test('howl stays on hero model and interruption never breaks bounds',()=>{
 const t=createTransition(200);
 t.set('howl');assert.equal(t.advance(200).heroOpacity,1);
 t.set('run');t.advance(65);t.set('idle');
 const s=t.advance(25);
 assert.ok(s.heroOpacity>=0&&s.heroOpacity<=1);
 assert.ok(s.runnerOpacity>=0&&s.runnerOpacity<=1);
 assert.ok(Math.abs(s.heroOpacity+s.runnerOpacity-1)<1e-8);
});
test('reduced motion swaps immediately and rejects bad inputs',()=>{
 const t=createTransition(0);
 assert.equal(t.set('run').runnerOpacity,1);
 assert.equal(t.set('idle').runnerOpacity,0);
 assert.throws(()=>t.set('attack'),RangeError);
 assert.throws(()=>t.advance(-1),TypeError);
});
