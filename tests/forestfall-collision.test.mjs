import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import collision from '../src/forestfall-collision-core.js';

const src=path=>readFileSync(path,'utf8');
const video=src('src/forestfall-video.js');
const runtime=src('src/arena3d-runtime.js');
const html=src('index.html');
const css=src('src/forestfall-video.css');

test('Forestfall source-frame contact at 11.82 seconds, not the old early dust cue',()=>{
 assert.equal(collision.SOURCE_SECONDS,14.93);
 assert.equal(collision.ENTER,11.53);
 assert.equal(collision.CONTACT,11.82);
 assert.equal(collision.EXIT,13.22);
 assert.equal(collision.at(11.4).live,false);
 assert.equal(collision.at(11.6).phase,'approach');
 assert.equal(collision.at(11.7).contact,false);
 assert.equal(collision.at(11.82).phase,'collision');
 assert.equal(collision.at(11.82).contact,true);
 assert.equal(collision.at(13.3).phase,'outro');
 assert.equal(collision.at(13.3).live,false);
});
test('scaled-duration and replay/seeking use one deterministic, bounded pose',()=>{
 const a=collision.at(11.82),b=collision.at(11.82,14.93),c=collision.at(11.82*2,29.86);
 assert.deepEqual(a,b);
 assert.deepEqual(b,c);
 for(const t of [0,4,11.53,11.68,11.82,12.1,13.0,14.93,50]){
  const p=collision.at(t);
  for(const key of ['approach','hit','recoil','dust']){
   assert.ok(Number.isFinite(p[key]),key+' must remain finite');
   assert.ok(p[key]>=0&&p[key]<=1,key+' must remain bounded');
  }
  assert.ok(p.bearY>=0&&p.bearY<=1.65);
 }
 const pre=collision.at(11.55),contact=collision.at(11.82),post=collision.at(12.2);
 assert.ok(pre.bearY>contact.bearY);
 assert.ok(pre.bearX<contact.bearX);
 assert.ok(post.mooseX>contact.mooseX);
});
test('only an actual Bear-to-Moose bout with both private native models qualifies',()=>{
 const event={attacker:0,attackerId:'bear',defender:1,defenderId:'moose'};
 const ok={bear:true,moose:true,webgl:true};
 assert.equal(collision.supports(event,ok),true);
 assert.equal(collision.supports({...event,attacker:1,defender:0},ok),true);
 assert.equal(collision.supports({...event,attackerId:'moose',defenderId:'bear'},ok),false);
 assert.equal(collision.supports({...event,defenderId:'bear'},ok),false);
 assert.equal(collision.supports({...event,defender:0},ok),false);
 assert.equal(collision.supports(event,{...ok,moose:false}),false);
 assert.equal(collision.supports(event,{...ok,bear:false}),false);
 assert.equal(collision.supports(event,{...ok,webgl:false}),false);
});
test('video source match-cuts into live native scene and back, preserving fallback',()=>{
 assert.ok(html.indexOf('src/forestfall-collision-core.js')<
   html.indexOf('src/forestfall-video.js'));
 assert.ok(video.includes('window.NoahsForestfallCollisionCore'));
 assert.ok(video.includes('createForestfallCollision?.({'));
 assert.ok(video.includes('host:nativeStage,event'));
 assert.ok(video.includes("node.classList.toggle('ark-forestfall-3d-live',Boolean(rendered))"));
 assert.ok(video.includes("node.dataset.collision=collision?'native-fbx':'video-fallback'"));
 assert.ok(video.includes("collision?.stop()"));
 assert.ok(video.includes("video.addEventListener('ended',()=>close(true)"));
 assert.ok(css.includes('.ark-forestfall-3d-live .ark-forestfall-native-stage'));
 assert.ok(css.includes('.ark-forestfall-3d-live .ark-forestfall-reaction'));
});
test('live scene uses user imported skinned models and actual Moose native Hit/KO',()=>{
 assert.ok(runtime.includes("const model=source.clone(source.model)"));
 assert.ok(runtime.includes("new THREE.AnimationMixer(model)"));
 assert.ok(runtime.includes("bear.play('S');moose.play('idle')"));
 assert.ok(runtime.includes("moose.play(event.knockout?'knockout':'hit')"));
 assert.ok(runtime.includes("mixer.setTime(Math.max(0,time))"));
 assert.ok(runtime.includes("impactRenderer.render(world,camera3d)"));
 assert.ok(runtime.includes('impactRenderer?.dispose()'));
 assert.ok(runtime.includes("mode:'native-bear-moose-fbx'"));
 assert.ok(!video.includes('battle.stop('));
 assert.ok(!video.includes('nextRound()'));
 assert.ok(!runtime.includes('Forestfall HP ='));
});
