#!/usr/bin/env node
/* Offline asset intake guard — no glTF loader/network required.
 * Run: node scripts/verify-tiger-assets.mjs <orange-hero.glb> <native-runner.glb>
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

function readGLB(path){
  const b=readFileSync(path);
  if(b.byteLength<20 || b.toString('utf8',0,4)!=='glTF' ||
     b.readUInt32LE(4)!==2 || b.readUInt32LE(8)!==b.byteLength)
    throw new Error(basename(path)+': not a complete glTF 2.0 binary');
  let at=12,json=null,binaryBytes=0;
  while(at<b.length){
    if(at+8>b.length)throw new Error('Truncated GLB chunk');
    const size=b.readUInt32LE(at),type=b.readUInt32LE(at+4);
    if(size%4!==0||at+8+size>b.length)throw new Error('Malformed GLB chunk');
    if(type===0x4e4f534a)json=JSON.parse(b.subarray(at+8,at+8+size).toString('utf8').trim());
    if(type===0x004e4942)binaryBytes+=size;
    at+=8+size;
  }
  if(!json||!binaryBytes)throw new Error('GLB lacks JSON or binary geometry');
  const output={
    filename:basename(path),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),
    nodes:json.nodes?.length??0,meshes:json.meshes?.length??0,
    joints:json.skins?.[0]?.joints?.length??0,
    clips:(json.animations??[]).map(a=>a.name??'(unnamed)'),
    images:json.images?.length??0,licenses:json.asset?.extras?.license??json.asset?.extras?.License??'not embedded'
  };
  return {json,output};
}
export function verifyPair(hero,runner){
  const has=(arr,re)=>arr.some(x=>re.test(x));
  const a=hero.output,b=runner.output;
  if(!a.meshes||!b.meshes||a.joints<20||b.joints<20)throw new Error('Mesh / articulated skeleton not detected');
  if(!has(a.clips,/^idle$/i)||!has(a.clips,/howl/i))
    throw new Error('Orange hero needs independent Idle and Howl clips');
  if(!has(b.clips,/run/i))throw new Error('Native runner needs a Run clip');
  if(a.sha256===b.sha256)throw new Error('Model-swap assets must be different');
  if(!a.images||!b.images)throw new Error('Embedded textures missing');
  if(a.joints!==121||b.joints!==47)
    console.warn('Rig counts differ from the verified 121-joint hero / 47-joint runner; inspect before using.');
  return [a,b];
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [, ,heroPath,runnerPath]=process.argv;
  if(!heroPath||!runnerPath){
    console.error('Usage: node scripts/verify-tiger-assets.mjs <orange-hero.glb> <native-runner.glb>');
    process.exitCode=2;
  }else try{
    const verified=verifyPair(readGLB(heroPath),readGLB(runnerPath));
    for(const x of verified)console.log(JSON.stringify(x,null,2));
    console.log('PASS: tiger model-swap clips/rigs/textures identified. Visual approval still required.');
  }catch(e){console.error('FAIL:',e.message);process.exitCode=1;}
}
export {readGLB};
