import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {CLIPS,ids,getClip,createDirector}=require('../src/bear-motion-core.js');

test('native bear attack clips are distinct files, not re-skinned tiger poses',()=>{
 const names=['guts','technique','power','special'].map(id=>getClip(id).file);
 assert.equal(new Set(names).size,4);
 for(const id of ['guts','technique','power','special'])
   assert.equal(getClip(id).kind,'attack');
});
test('bear idle and run have native looping animation files',()=>{
 for(const id of ['idle','walk','run','sprint']){
  assert.ok(getClip(id).loop);
  assert.ok(getClip(id).file.endsWith('.FBX'));
 }
});
test('native hit and knockout are separate and KO holds its ending',()=>{
 const director=createDirector();
 const hit=director.select('hit');
 assert.equal(hit.returnTo,'idle');
 assert.equal(director.complete(hit.sequence).id,'idle');
 const ko=director.select('knockout');
 assert.equal(ko.returnTo,null);
 assert.equal(director.complete(ko.sequence),null);
 assert.equal(director.get().id,'knockout');
});
test('stale finishing animation cannot override new selected animation',()=>{
 const director=createDirector();
 const attack=director.select('power');
 director.select('run');
 assert.equal(director.complete(attack.sequence),null);
 assert.equal(director.get().id,'run');
});
test('all references are relative native FBX names and invalid IDs rejected',()=>{
 for(const id of ids)assert.match(getClip(id).file,/^[A-Za-z0-9_]+\.FBX$/);
 assert.throws(()=>getClip('__proto__'),RangeError);
 assert.throws(()=>getClip('tiger'),RangeError);
});
