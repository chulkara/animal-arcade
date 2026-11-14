import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {SCORES,sampleAction}=require('../src/tiger-action-core.js');

test('all action tracks are sorted, finite and return exactly to neutral for attacks',()=>{
 for(const [name,frames] of Object.entries(SCORES)){
   assert.equal(frames[0].ms,0,name);
   for(let i=1;i<frames.length;i++) assert.ok(frames[i].ms>frames[i-1].ms,name);
   for(const frame of frames) for(const val of Object.values(frame)) if(typeof val==='number') assert.ok(Number.isFinite(val));
   const type=['G','T','P','SPECIAL'].includes(name)?'attack':name.toLowerCase();
   const options={technique:name,special:name==='SPECIAL'};
   const duration=frames.at(-1).ms;
   const end=sampleAction(type,duration,options);
   assert.equal(end.complete,true);
   if(type==='attack')assert.ok(Object.values(end.pose).every(v=>v===0),name);
 }
});
test('different G/T/P moves have distinct timing and contact silhouettes',()=>{
 const guts=sampleAction('attack',700,{technique:'G'});
 const technique=sampleAction('attack',530,{technique:'T'});
 const power=sampleAction('attack',825,{technique:'P'});
 assert.notEqual(guts.duration,technique.duration);
 assert.notEqual(technique.duration,power.duration);
 assert.ok(guts.pose.foreleg>.1);
 assert.ok(technique.pose.lift>.1);
 assert.ok(power.pose.jaw>.2);
});
test('run mode is used only during approach; victory uses howling hero',()=>{
 assert.equal(sampleAction('attack',390,{technique:'G'}).mode,'run');
 assert.equal(sampleAction('attack',700,{technique:'G'}).mode,'idle');
 assert.equal(sampleAction('victory',600).mode,'howl');
 assert.equal(sampleAction('ko',1200).mode,'idle');
});
test('reduced motion never moves the model and rejected invalid input',()=>{
 const s=sampleAction('attack',300,{technique:'G',reducedMotion:true});
 assert.ok(Object.values(s.pose).every(v=>v===0));
 assert.equal(s.mode,'idle');
 assert.throws(()=>sampleAction('attack',-10),TypeError);
 assert.throws(()=>sampleAction('invalid',100),RangeError);
});
test('knockout is distinct from hurt and does not recover prematurely',()=>{
 const hurt=sampleAction('hurt',860),ko=sampleAction('ko',1600);
 assert.equal(hurt.complete,true);
 assert.equal(ko.complete,true);
 assert.ok(ko.pose.lift<-.3);
 assert.ok(ko.pose.roll>.2);
});
