import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readGLB,verifyPair} from '../scripts/verify-tiger-assets.mjs';

function makeGLB(doc){
  const json=Buffer.from(JSON.stringify(doc));
  const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const bin=Buffer.alloc(4);
  const out=Buffer.alloc(12+8+padded.length+8+bin.length);
  out.write('glTF',0,'utf8');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);
  padded.copy(out,20);
  const offset=20+padded.length;
  out.writeUInt32LE(bin.length,offset);out.writeUInt32LE(0x004e4942,offset+4);
  bin.copy(out,offset+8);
  return out;
}
function fixture(clips,joints){
 return {asset:{version:'2.0',extras:{license:'CC BY 4.0'}},
   meshes:[{primitives:[{}]}],skins:[{joints:Array.from({length:joints},(_,i)=>i)}],
   nodes:Array.from({length:joints+2},(_,i)=>({name:'joint'+i})),
   images:[{mimeType:'image/png',bufferView:0}],
   animations:clips.map(name=>({name,channels:[],samplers:[]}))};
}
test('read GLB assets and verify matching tiger Idle/Howl plus native runner Run',()=>{
 const dir=mkdtempSync(join(tmpdir(),'arkade-glb-'));
 try{
   const hero=join(dir,'hero.glb'),runner=join(dir,'runner.glb');
   writeFileSync(hero,makeGLB(fixture(['Idle','Howl_directional_WIP'],121)));
   writeFileSync(runner,makeGLB(fixture(['Run'],47)));
   const result=verifyPair(readGLB(hero),readGLB(runner));
   assert.equal(result[0].joints,121);assert.equal(result[1].joints,47);
   assert.ok(result[0].sha256!==result[1].sha256);
   const invalid=join(dir,'invalid.glb');writeFileSync(invalid,Buffer.from('not a glb'));
   assert.throws(()=>readGLB(invalid),/not a complete/);
   const wrong=join(dir,'wrong.glb');writeFileSync(wrong,makeGLB(fixture(['Idle'],121)));
   assert.throws(()=>verifyPair(readGLB(wrong),readGLB(runner)),/Howl/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
