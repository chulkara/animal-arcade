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
 const guts=sampleAction('attack',650,{technique:'G'});
 const technique=sampleAction('attack',515,{technique:'T'});
 const power=sampleAction('attack',790,{technique:'P'});
 assert.notEqual(guts.duration,technique.duration);
 assert.notEqual(technique.duration,power.duration);
 assert.ok(guts.pose.head>.30);
 assert.ok(guts.pose.shoulder>.25);
 assert.ok(technique.pose.sweep>1);
 assert.ok(technique.pose.yaw>.2);
 assert.ok(power.pose.rear>.65);
 assert.ok(power.pose.forelegRight>1.8);
});
test('the entire strike stays on one high-detail hero mesh, separate Run preview unchanged',()=>{
 for(const technique of ['G','T','P']){
   const frames=SCORES[technique];
   assert.ok(frames.every(f=>f.mode==='idle'),technique);
   for(let i=0;i<=frames.at(-1).ms;i+=31)
     assert.equal(sampleAction('attack',i,{technique}).mode,'idle',technique+' '+i);
 }
 assert.ok(SCORES.SPECIAL.every(f=>f.mode!=='run'));
 assert.equal(sampleAction('attack',200,{special:true}).mode,'howl');
 assert.equal(sampleAction('attack',900,{special:true}).mode,'idle');
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
 assert.ok(ko.pose.lift>.4);
 assert.ok(ko.pose.roll>2);
 assert.ok(Math.abs(ko.pose.pitch)<.4);
});

test('accepted hit and knockout poses and their interpolation remain unchanged',()=>{
 const h=sampleAction('hurt',115),ko=sampleAction('ko',1100);
 assert.equal(h.pose.travel,-.14);
 assert.equal(h.pose.lift,.10);
 assert.equal(h.pose.head,.33);
 assert.equal(ko.pose.travel,-.30);
 assert.equal(ko.pose.roll,2.30);
 assert.equal(ko.pose.lift,.43);
 // HURT's two old keyframes are smoothstepped rather than altered to cubic.
 const hmid=sampleAction('hurt',(115+260)/2);
 assert.equal(hmid.pose.travel,-.19);
});
test('new attacks keep pose continuity across every timeline beat',()=>{
 for(const name of ['G','T','P','SPECIAL','VICTORY']){
   const options={technique:name,special:name==='SPECIAL'};
   const type=name==='VICTORY'?'victory':'attack';
   for(const frame of SCORES[name].slice(1,-1)){
     const before=sampleAction(type,frame.ms-.02,options).pose;
     const after=sampleAction(type,frame.ms+.02,options).pose;
     for(const key of Object.keys(before))
       assert.ok(Math.abs(before[key]-after[key])<.003,name+' '+frame.ms+' '+key);
   }
 }
});
test('victory reuses the original Howl with NO extra head/back transform',()=>{
 assert.ok(SCORES.VICTORY.slice(0,-1).every(f=>f.mode==='howl'));
 let maximumHeadTilt=0;
 for(let i=0;i<=SCORES.VICTORY.at(-1).ms;i+=15){
   const snap=sampleAction('victory',i);
   maximumHeadTilt=Math.max(maximumHeadTilt,Math.abs(snap.pose.head));
   assert.equal(snap.mode,i>=SCORES.VICTORY.at(-1).ms?'idle':'howl');
 }
 assert.ok(maximumHeadTilt<=.05);
});

test('V4 Guts, Technique, Power and Special have genuinely distinct contact poses',()=>{
 const G=sampleAction('attack',650,{technique:'G'}).pose;
 const T=sampleAction('attack',515,{technique:'T'}).pose;
 const P=sampleAction('attack',790,{technique:'P'}).pose;
 const S=sampleAction('attack',1190,{special:true}).pose;
 assert.ok(G.head>.30&&G.shoulder>.25&&G.lift<.10,'Guts is shoulder-led low charge');
 assert.ok(T.sweep>1.1&&Math.abs(T.yaw)>.2&&T.forelegRight<0,'Technique is asymmetric lateral claw slash');
 assert.ok(P.rear>.65&&P.forelegRight>1.8&&P.lift>.4,'Power rears with both paws');
 assert.ok(S.lift>.55&&S.travel>.35&&S.jaw>.3,'Special is airborne pounce');
 for(const [label,pose] of Object.entries({G,T,P,S}))
   assert.ok(Object.values(pose).every(x=>Number.isFinite(x)),label);
});
test('approved HURT and KO original frames and sampling remain unchanged with new pose channels',()=>{
 const h=sampleAction('hurt',115).pose,ko=sampleAction('ko',1100).pose;
 assert.equal(h.head,.33);assert.equal(h.neck,.22);
 assert.equal(ko.roll,2.30);assert.equal(ko.lift,.43);
 for(const pose of [h,ko])
   for(const field of ['rear','yaw','lateral','sweep','shoulder','forelegRight'])
     assert.equal(pose[field],0,field);
});
