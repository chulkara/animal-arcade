import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const director=require('../src/combat-cinematics-core.js');
const arena=require('../src/arena3d-core.js');
const base={attacker:0,defender:1,attackerId:'moose',defenderId:'bear',
 move:'P',finished:false,damage:48,knockout:false,miracleName:null};

test('each animal has three repeatable signature shot sequences plus a fourth special',()=>{
 for(const id of ['bear','moose']){
   const names=['G','T','P'].map(move=>director.spec(id,move).name);
   assert.equal(new Set(names).size,3);
   const shots=['G','T','P','S'].map(move=>director.spec(id,move).shots);
   for(const set of shots){assert.equal(set.length,4);assert.ok(set.includes('impact'));assert.ok(set.includes('recoil'));}
   assert.notDeepEqual(shots[1],shots[2]);
 }
 assert.throws(()=>director.spec('tiger','G'),RangeError);
});

test('signature attack timeline yields anticipation, committed move, contact, and victim recoil',()=>{
 const evt={...base,move:'P'};
 const ticks=[0,520,1220,1650].map(ms=>director.shot(evt,ms));
 assert.deepEqual(ticks.map(t=>t.beat),['INTRO','ATTACK','CONTACT','REACTION']);
 assert.ok(director.duration(evt).total>1840);
 assert.equal(director.panel(evt,1230).sub,'DIRECT HIT');
 assert.match(director.panel(evt,1650).sub,/48/);
});

test('universal Miracle introductions apply to either animal, not a specific rig',()=>{
 for(const animal of ['bear','moose']){
   const evt={...base,attackerId:animal,move:'G',miracleName:'STORM BELL',miracleBonus:14};
   const t=director.duration(evt,1200);
   assert.equal(t.miracleLead,850);
   assert.equal(director.shot(evt,300,1200).beat,'MIRACLE');
   assert.equal(director.panel(evt,300,1200).miracle,'storm');
   assert.equal(director.shot(evt,900,1200).beat,'INTRO');
 }
 assert.deepEqual(Object.keys(director.MIRACLES),[
  'FALLING STAR','DAWN CHORUS','STORM BELL','TIDAL WISH','ECLIPSE OATH'
 ]);
});

test('multi-angle victory gives distinct low-angle, orbit, high and wide hero shots',()=>{
 const evt={...base,attacker:1,defender:0,attackerId:'bear',
  defenderId:'moose',move:'G',knockout:true,finished:true};
 const start=director.duration(evt,1000).victoryStart;
 const shots=[start+50,start+1080,start+2200,start+3370]
  .map(ms=>director.shot(evt,ms,1000));
 assert.deepEqual(shots.map(s=>s.beat),['VICTORY','VICTORY','VICTORY','VICTORY']);
 assert.deepEqual(shots.map(s=>s.shot),['lowHero','sideHero','highHero','finale']);
 const cameras=shots.map(s=>director.camera(evt,start+s.local,1000));
 assert.ok(new Set(cameras.map(s=>[s.x,s.y,s.z,s.zoom].join(','))).size===4);
});

test('replacing the defender mirrors only the framing, never the signature attack animation',()=>{
 const one={...base,attacker:0,defender:1,attackerId:'bear',defenderId:'moose',move:'T'};
 const mirror={...one,attacker:1,defender:0};
 assert.deepEqual(director.spec(one.attackerId,one.move),
   director.spec(mirror.attackerId,mirror.move));
 assert.equal(director.shot(one,300,1000).shot,director.shot(mirror,300,1000).shot);
 const c1=director.camera(one,300,1000),c2=director.camera(mirror,300,1000);
 assert.ok(c1.x*c2.x<=0,'camera must mirror for opposite attacker side');
});

test('reel input, storyboard, model camera and sound scripts are wired after the combat engine',()=>{
 const html=readFileSync('index.html','utf8');
 const ui=readFileSync('src/combat-ui.js','utf8');
 const model=readFileSync('src/arena3d-runtime.js','utf8');
 const audio=readFileSync('src/audio.js','utf8');
 assert.ok(html.includes('src/combat-cinematics.css'));
 assert.ok(html.includes('src/arcade-reels.css'));
 const order=['src/combat-ui.js','src/arena3d-core.js','src/combat-cinematics-core.js',
 'src/combat-cinematics.js','src/arena3d-runtime.js'].map(src=>html.indexOf(src));
 assert.ok(order.every((idx,i)=>idx>=0&&(!i||idx>order[i-1])));
 assert.ok(ui.includes("arkade:reelstop"));
 assert.ok(ui.includes('ark-reel-lamps'));
 assert.ok(model.includes('cinematics.camera(event,time,nativeLength(event))'));
 assert.ok(model.includes("defender?.native(event.knockout?'knockout':'hit')"));
 assert.ok(audio.includes("case 'cinemaMiracle'"));
 assert.ok(audio.includes("case 'cinemaVictory'"));
 assert.ok(readFileSync('src/painted-menu.js','utf8').includes("const ART='./assets/approved-menu.png'"));
});

test('battle event carries equipped Miracle identity and damage into the universal cinematic system',()=>{
 const s={phase:'RESULT',round:2,session:{bout:1},
  animals:[{id:'bear',hp:123},{id:'moose',hp:69}],
  lastEvent:{kind:'HIT',attacker:0,defender:1,technique:'P',special:true,
   damage:38,remainingHp:69,miracleBonus:12,miracleName:'TIDAL WISH'}};
 const e=arena.battleEvent(s);
 assert.equal(e.miracleName,'TIDAL WISH');
 assert.equal(e.miracleBonus,12);
 assert.equal(e.damage,38);
 assert.equal(director.miracle(e.miracleName).type,'tide');
});


test('regression: Bear is framed as the winner, never the KO victim',()=>{
 for(const attacker of [0,1]){
   const defender=1-attacker;
   const evt={...base,attacker,defender,attackerId:'bear',defenderId:'moose',
     move:'P',finished:true,knockout:true};
   const victoryStart=director.duration(evt,1200).victoryStart;
   const heroWorldX=attacker===0?-2.02:2.02;
   for(const delta of [100,1100,2300,3350]){
     const cam=director.camera(evt,victoryStart+delta,1200);
     assert.equal(cam.beat,'VICTORY');
     assert.equal(cam.targetX,heroWorldX,
       'All four victory cameras must look at the winning Bear');
     assert.ok(Math.abs(cam.x-heroWorldX)<1.4,
       'Camera origin must stay near the hero, not the KO victim');
     assert.ok(cam.zoom<=1.10,'Do not crop the winning Bear with excessive zoom');
     assert.ok(cam.cut,'The victory sequence should use decisive film cuts');
   }
 }
});

test('regression: Bear contact is a two-fighter shot, not a cropped victim closeup',()=>{
 for(const attacker of [0,1]){
   const evt={...base,attacker,defender:1-attacker,
     attackerId:'bear',defenderId:'moose',move:'T'};
   const at=director.duration(evt,1200).contact+55;
   const cam=director.camera(evt,at,1200);
   assert.equal(cam.beat,'CONTACT');
   assert.equal(cam.targetX,0);
   assert.ok(Math.abs(cam.x)<0.15);
   assert.ok(cam.zoom<=1.08);
   assert.ok(cam.z>=10.5);
 }
});

test('cinematic footage UI protects Bear silhouette and hides stale review HUD',()=>{
 const cinemaCss=readFileSync('src/combat-cinematics.css','utf8');
 const reviewCss=readFileSync('src/arena3d.css','utf8');
 const model=readFileSync('src/arena3d-runtime.js','utf8');
 assert.match(cinemaCss,/ark-cine-contact-readable/);
 assert.match(cinemaCss,/overflow-wrap:break-word/);
 assert.match(reviewCss,/ark-bear-reviewing \.ark-arena-hud/);
 assert.match(reviewCss,/ark-bear-reviewing \.combat-battlefield \.combat-animal-name/);
 assert.match(model,/model\.position\.x=restX;model\.position\.z=restZ/);
 assert.match(model,/wants\?\.cut \? \.88/);
});
