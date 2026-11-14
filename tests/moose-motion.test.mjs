import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {MOVES,sampleMove,FIELDS}=require('../src/moose-action-core.js');
const {CLIPS,COATS,roleFor,fileFor,textureFor}=require('../src/moose-assets-core.js');

test('all original attack silhouettes differ, with source-native base clips',()=>{
 assert.deepEqual(Object.keys(MOVES),['Guts','Technique','Power','Special']);
 const G=sampleMove('Guts',840).pose,T=sampleMove('Technique',710).pose,
 P=sampleMove('Power',850).pose,S=sampleMove('Special',1050).pose;
 assert.ok(G.travel>.85&&G.headPitch>.3);
 assert.ok(T.headYaw>.7&&T.yaw>.3);
 assert.ok(P.leftHoof>1&&P.rightHoof>1);
 assert.ok(S.lift>.7&&S.travel>.6);
 assert.deepEqual(Object.values(MOVES).map(m=>m.base),['Run','Idle','Breathing','Jump']);
 for(const name of Object.keys(MOVES))assert.deepEqual(
  sampleMove(name,MOVES[name].frames.at(-1).ms).pose,
  Object.fromEntries(FIELDS.map(x=>[x,0]))
 );
});
test('moose moves are smoothly bounded at authored beats',()=>{
 for(const [name,m]of Object.entries(MOVES)){
  let previous=-1;
  for(const f of m.frames){
   assert.ok(f.ms>previous);previous=f.ms;
  }
  for(const f of m.frames.slice(1,-1)){
   const a=sampleMove(name,f.ms-.02).pose,b=sampleMove(name,f.ms+.02).pose;
   for(const field of FIELDS)assert.ok(Math.abs(a[field]-b[field])<.004,name+' '+field);
  }
 }
});
test('19 original cervid motion names are available; no pretend native attacks',()=>{
 assert.equal(Object.keys(CLIPS).length,19);
 for(const f of Object.values(CLIPS))assert.match(f,/^[A-Za-z0-9_]+\.FBX$/);
 for(const id of ['Idle','Run','Jump','Hit','Knockout'])assert.ok(fileFor(id));
 assert.ok(!Object.keys(CLIPS).some(id=>/guts|technique|power|special/i.test(id)));
});
test('FBX connections map separate antlers, head and body without black tint',()=>{
 assert.equal(roleFor('Chifre_Moose','Moose_Chifre',0),'antlers');
 assert.equal(roleFor('sm_1_0_1','Moose_Head',0),'head');
 assert.equal(roleFor('sm_1_0_1','Moose_Body',1),'body');
 assert.equal(roleFor('sm_1_0_1','',0),'head');
 assert.equal(roleFor('sm_1_0_1','',1),'body');
 assert.equal(textureFor('body'),'Moose Body Warm.png');
 assert.equal(textureFor('body','original'),'Moose Body.png');
 assert.equal(textureFor('head','white'),'White Moose Head.png');
 assert.equal(textureFor('antlers','brown'),'Moose Horn.png');
 assert.ok(Object.isFrozen(COATS));
});
test('safe input handling and reduced motion',()=>{
 assert.ok(Object.values(sampleMove('Guts',900,{reducedMotion:true}).pose).every(x=>x===0));
 assert.throws(()=>sampleMove('Bad',5),RangeError);
 assert.throws(()=>sampleMove('Guts',-1),TypeError);
 assert.throws(()=>fileFor('__proto__'),RangeError);
 assert.throws(()=>textureFor('wings'),RangeError);
 assert.throws(()=>textureFor('head','neon'),RangeError);
});