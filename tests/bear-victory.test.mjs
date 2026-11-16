import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const cinema=require('../src/combat-cinematics-core.js');
const assets=require('../src/arena3d-core.js');

const event={attacker:0,defender:1,attackerId:'bear',defenderId:'moose',
  move:'P',finished:true,knockout:true,damage:0,miracleName:null};
const file=(name,size=512)=>({name,size});

test('reference-inspired victory has a visible inhale, head throw and 2+ second roar',()=>{
 const t=cinema.duration(event,1500);
 assert.equal(t.total-t.victoryStart,cinema.VICTORY_END_MS);
 assert.ok(cinema.VICTORY_HOWL_START_MS<cinema.VICTORY_HOWL_CUE_MS);
 assert.ok(cinema.VICTORY_HOWL_CUE_MS<cinema.VICTORY_BANNER_MS);
 assert.ok(cinema.VICTORY_END_MS-cinema.VICTORY_HOWL_CUE_MS>2000);

 const standing=cinema.bearHowl(1000);
 assert.equal(standing.active,false);
 assert.equal(standing.jawOpen,0);
 const inhale=cinema.bearHowl(2400);
 assert.equal(inhale.phase,'inhale');
 assert.ok(inhale.headPitch>.08,'Bear must first lower its muzzle to inhale');
 assert.ok(inhale.bodyDrop<-.03,'Bear should gather weight through its body');
 assert.equal(inhale.jawOpen,0);

 const throwBack=cinema.bearHowl(2900);
 assert.equal(throwBack.phase,'throw');
 assert.ok(throwBack.headPitch<0);
 assert.ok(throwBack.neckPitch<0);
 const roaring=cinema.bearHowl(3380);
 assert.equal(roaring.phase,'roar');
 assert.ok(roaring.headPitch<-.42,'The head must clearly tip backward');
 assert.ok(roaring.neckPitch<-.2,'The neck must visibly extend');
 assert.ok(roaring.jawOpen>.8,'Open the jaw while vocalizing');
 assert.ok(roaring.forePaw<-.15,'Both forepaws participate');
 assert.ok(roaring.chestPitch<-.1);
 const held=cinema.bearHowl(5300);
 assert.equal(held.phase,'hold');
 assert.ok(held.jawOpen>.6,'Bear must remain expressive until the shot completes');
});

test('four camera cuts lead to a sustained winning performance, not just a still image',()=>{
 const t=cinema.duration(event,1200);
 const sequence=[80,1300,2250,2750,3400,4700]
   .map(ms=>cinema.shot(event,t.victoryStart+ms,1200));
 assert.deepEqual(sequence.map(x=>x.shot),
   ['lowHero','sideHero','highHero','finale','finale','finale']);
 assert.ok(sequence[4].local>cinema.VICTORY_HOWL_CUE_MS);
 assert.ok(sequence[5].local>cinema.VICTORY_BANNER_MS);
});

test('a supplied native roar FBX is auto-discovered from the private local folder',()=>{
 const spec=assets.REQUIRED.bear;
 const files=[spec.base,...Object.values(spec.motions),...Object.values(spec.textures)]
   .map(file);
 const without=assets.planFiles('bear',files);
 assert.equal(without.ready,true);
 assert.equal(without.clips.roar,undefined);
 const withRoar=assets.planFiles('bear',files.concat([
   file('StandHind_Roar_02.FBX'),file('Loco_Growl_01.FBX')]));
 assert.equal(withRoar.ready,true);
 assert.equal(withRoar.clips.roar.name,'StandHind_Roar_02.FBX');
 assert.equal(withRoar.missing.length,0);
});

test('the renderer actually activates a native roar and a physical fallback, not only soundwaves',()=>{
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 const overlay=readFileSync('src/combat-cinematics.js','utf8');
 const css=readFileSync('src/combat-cinematics.css','utf8');
 assert.ok(runtime.includes("attacker.native('roar')"));
 assert.ok(runtime.includes('winner.victoryGesture(sequence.elapsed-start,Boolean(sequence.roarPlayed))'));
 assert.ok(runtime.includes('howl.bodyLean'));
 assert.ok(runtime.includes('howl.bodyDrop'));
 assert.ok(runtime.includes('howl.headPitch'));
 assert.ok(runtime.includes('morphTargetDictionary'));
 assert.ok(overlay.includes("window.NoahsAudio?.cue('bearHowl')"));
 assert.ok(overlay.includes('api.VICTORY_HOWL_CUE_MS'));
 assert.ok(overlay.includes('api.VICTORY_BANNER_MS'));
 assert.ok(overlay.includes("overlay.dataset.result=winnerVisible?'visible':'hidden'"));
 assert.ok(css.includes('[data-result="visible"]'));
 assert.ok(css.includes('[data-howl-phase="roar"]'));
});


test('film review distinguishes actual mouth animation from body-only fallback',()=>{
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 assert.ok(runtime.includes('function bearMouthStatus()'));
 assert.ok(runtime.includes('NATIVE ROAR MOTION LOADED'));
 assert.ok(runtime.includes('MOUTH RIG AVAILABLE'));
 assert.ok(runtime.includes('BODY HOWL ONLY · NO MOUTH CONTROL'));
 assert.ok(runtime.includes('const howlStage=current.beat'));
 assert.ok(runtime.includes('bearReview.howlStage=howlStage'));
 assert.ok(runtime.includes('No native roar FBX detected'));
});
