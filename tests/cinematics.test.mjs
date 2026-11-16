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
 const t=director.duration(evt,1840);
 const ticks=[0,t.actionLead+100,t.actionLead+500,
   t.actionLead+t.contact+55,t.actionLead+t.contact+230]
   .map(ms=>director.shot(evt,ms,1840));
 assert.deepEqual(ticks.map(v=>v.beat),['FOCUS','INTRO','ATTACK','CONTACT','REACTION']);
 assert.ok(t.actionLead>=t.focusLead&&t.total>1840);
 assert.equal(director.panel(evt,t.actionLead+t.contact+55,1840).sub,'DIRECT HIT');
 assert.match(director.panel(evt,t.actionLead+t.contact+230,1840).sub,/48/);
});

test('universal Miracle introductions apply to either animal, not a specific rig',()=>{
 for(const animal of ['bear','moose']){
   const evt={...base,attackerId:animal,move:'G',miracleName:'STORM BELL',miracleBonus:14};
   const t=director.duration(evt,1200);
   assert.equal(t.miracleLead,850);
   assert.equal(director.shot(evt,300,1200).beat,'MIRACLE');
   assert.equal(director.panel(evt,300,1200).miracle,'storm');
   assert.equal(director.shot(evt,900,1200).beat,'FOCUS');
   assert.equal(director.shot(evt,t.actionLead+30,1200).beat,'INTRO');
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


test('regression: winning Bear gets front, reverse, overhead and final face close-up',()=>{
 for(const attacker of [0,1]){
  const evt={...base,attacker,defender:1-attacker,
   attackerId:'bear',defenderId:'moose',move:'P',finished:true,knockout:true};
  const begin=director.duration(evt,1200).victoryStart;
  const heroWorldX=attacker===0?-2.02:2.02;
  const views=[100,1100,2300,3350].map(t=>director.camera(evt,begin+t,1200));
  const angles=views.map(cam=>Math.atan2(cam.x-cam.targetX,cam.z));
  views.forEach((cam,index)=>{
   assert.equal(cam.beat,'VICTORY');
   assert.equal(cam.targetX,heroWorldX);
   assert.ok(cam.zoom<=1.7);
   assert.equal(cam.cut,true);
  });
  assert.ok(Math.abs(angles[0]-angles[1])>.8,'Low front and reverse angles must differ');
  assert.ok(Math.abs(angles[1]-angles[2])>.6,'Reverse and overhead azimuth must differ');
  assert.ok(views[2].y-views[0].y>5,'The third camera must actually look down');
  assert.ok(views[3].z<2,'Final shot must be close enough to face the winning Bear');
  assert.ok(views[3].zoom>1.25,'The winning portrait must be close, not the same profile');
 }
});

test('regression: Bear contact is a two-fighter shot, not a cropped victim closeup',()=>{
 for(const attacker of [0,1]){
   const evt={...base,attacker,defender:1-attacker,
     attackerId:'bear',defenderId:'moose',move:'T'};
   const t=director.duration(evt,1200);
   const at=t.actionLead+t.contact+55;
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
 assert.ok(model.includes('camera.position.copy(wanted)'));
 assert.match(model,/lastCameraShot/);
 assert.match(model,/rootAnchors/);
 assert.ok(model.includes('actor.soleRest'));
});

test('Bear Guts, Technique and Power have separate bounded approach, impact and recovery',()=>{
 const values={};
 for(const move of ['G','T','P']){
  const evt={...base,attackerId:'bear',defenderId:'moose',move};
  const t=director.duration(evt,1600);
  const start=director.blocking(evt,0,1600);
  const windup=director.blocking(evt,t.actionLead+t.contact*.25,1600);
  const contact=director.blocking(evt,t.actionLead+t.contact,1600);
  const after=director.blocking(evt,t.actionLead+t.contact+900,1600);
  assert.equal(start.attackerTravel,0);
  assert.ok(Math.abs(windup.attackerTravel)<contact.attackerTravel);
  assert.ok(contact.attackerTravel>0&&contact.attackerTravel<=.9);
  assert.ok(contact.attackerLean>0,'Contact has clear forward body weight');
  assert.equal(after.attackerTravel,0,'Bear returns to its starting point');
  assert.equal(after.defenderTravel,0,'Victim cannot drift away over time');
  values[move]=contact.attackerTravel;
 }
 assert.ok(values.G>values.P&&values.P>values.T,
  'Charging Guts travels farther than a high strike or low swipe');
});

test('Guts uses a stable two-fighter setup before the attack cut',()=>{
 const evt={...base,attackerId:'bear',move:'G'};
 const t=director.duration(evt,1600);
 const focus=director.camera(evt,0,1600);
 const intro=director.camera(evt,t.actionLead+20,1600);
 const contact=director.camera(evt,t.actionLead+t.contact+20,1600);
 assert.equal(focus.beat,'FOCUS');
 assert.ok(Math.abs(focus.x-focus.targetX)>2,
  'Guts must approach from a low rear-quarter instead of a static side camera');
 assert.ok(focus.y<1.25,'Guts buildup should feel heavy and ground-level');
 assert.equal(intro.beat,'INTRO');
 assert.equal(intro.targetX,0);
 assert.ok(intro.z>12);
 assert.equal(contact.beat,'CONTACT');
 assert.equal(contact.targetX,0);
 assert.ok(contact.z>12);
});


test('Bear victory is now four camera cuts plus small native-rig celebration accents',()=>{
 const source=readFileSync('src/arena3d-runtime.js','utf8');
 assert.ok(source.includes('actor.victoryGesture=(elapsed)=>'));
 assert.ok(source.includes("winner.victoryGesture(sequence.elapsed-start)"));
 for(const joint of ['RigHead','RigNeck','RigSpine1','RigLFLeg1','RigRFLeg1'])
   assert.ok(source.includes("set('"+joint+"'"),'Expected a restrained victory accent for '+joint);
 assert.ok(source.includes('camera.position.copy(wanted)'), '3D camera must cut on a new shot');
 assert.ok(source.includes('actor.soleRest'),'Bear must retain a planted hind-foot reference');
 assert.ok(source.includes('rootAnchors'),'Native RigRoot should not teleport the model');
});

test('original-video comparison: signature moves prepare before FBX contact and win on a facial closeup',()=>{
 for(const move of ['G','T','P','S']){
  const event={...base,attacker:0,defender:1,attackerId:'bear',
   defenderId:'moose',move,finished:move==='P'};
  const t=director.duration(event,1300);
  assert.ok(t.focusLead>=300,'Preparation must last long enough to be visible');
  assert.equal(t.actionLead,t.miracleLead+t.focusLead);
  assert.equal(director.shot(event,t.actionLead-10,1300).beat,'FOCUS');
  assert.equal(director.shot(event,t.actionLead+20,1300).beat,'INTRO');
  assert.equal(director.shot(event,t.actionLead+t.contact+25,1300).beat,'CONTACT');
 }
 const event={...base,attacker:0,defender:1,attackerId:'bear',
  defenderId:'moose',move:'P',finished:true};
 const begin=director.duration(event,1300).victoryStart;
 const portrait=director.camera(event,begin+3300,1300);
 assert.equal(portrait.shot,'finale');
 assert.ok(Math.abs(portrait.x-portrait.targetX)>3.8&&
   Math.abs(portrait.x-portrait.targetX)<5.5,
   'Camera should approach the muzzle without clipping the bear');
 assert.ok(portrait.zoom>=1.3);
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 const ui=readFileSync('src/combat-cinematics.js','utf8');
 assert.ok(runtime.includes('const lead=timing?.actionLead||0;'),
  'The native source clip must wait until cinematic focus concludes');
 assert.ok(runtime.includes("attacker.native('rear')"),
  'Use the source rear transition when available');
 assert.ok(ui.includes("event.attackerId.toUpperCase()+' WINS!'"));
 assert.ok(readFileSync('src/audio.js','utf8').includes("case 'cinemaWin'"));
});


test('impact hit stop holds the native animals for less than 100ms, not the battle clock',()=>{
 for(const attackerId of ['bear','moose']){
  for(const move of ['G','T','P']){
   const event={...base,attackerId,move};
   const t=director.duration(event,1200);
   const at=t.actionLead+t.contact;
   assert.equal(director.hitStop(event,at-1,1200),false);
   assert.equal(director.hitStop(event,at,1200),true);
   assert.equal(director.hitStop(event,at+director.HIT_STOP_MS-1,1200),true);
   assert.equal(director.hitStop(event,at+director.HIT_STOP_MS,1200),false);
  }
 }
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 assert.ok(runtime.includes('cinematics.hitStop('));
 assert.ok(runtime.includes('actor?.tick(stopped?0:dt)'));
 assert.ok(runtime.includes('new THREE.PerspectiveCamera'));
 assert.ok(runtime.includes('ground.receiveShadow=true'));
 assert.ok(runtime.includes('new THREE.InstancedMesh'));
});

test('Bear source 3D hit contact matches cinematic timing for all native clip lengths',()=>{
 for(const move of ['G','T','P','S']){
  for(const native of [750,1200,2000,3150]){
   const t=director.duration({...base,attackerId:'bear',move},native);
   assert.equal(t.contact,arena.contactMs('bear',move,native));
   assert.ok(t.actionLead>=t.focusLead);
   assert.ok(t.total>=t.finish);
  }
 }
});

test('bear final victory howls visibly and stays expressive in the held close-up',()=>{
 const none=director.bearHowl(1600);
 assert.equal(none.active,false);
 assert.equal(none.jawOpen,0);
 const near=director.bearHowl(director.VICTORY_HOWL_START_MS+220);
 assert.equal(near.active,true);
 assert.ok(near.headPitch<-.08,'Head needs a clear upward howl gesture');
 assert.ok(near.jawOpen>.25,'Jaw should open during the vocalization');
 const held=director.bearHowl(director.VICTORY_HOWL_START_MS+1600);
 assert.ok(held.jawOpen>.7,'The mouth must remain open at end of review');
 assert.ok(held.neckPitch<-.14,'Neck should extend, not stay level');
 for(const attacker of [0,1]){
  const evt={...base,attacker,defender:1-attacker,attackerId:'bear',
   defenderId:'moose',move:'P',finished:true};
  const t=director.duration(evt,1600);
  const final=director.camera(evt,t.victoryStart+3350,1600);
  assert.equal(final.shot,'finale');
  assert.ok(Math.abs(final.x-final.targetX)>=4,'Face-on winner shot');
 }
});

test('Bear howl drives actual jaw/morph targets when available and has an original vocal cue',()=>{
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 const audio=readFileSync('src/audio.js','utf8');
 const overlay=readFileSync('src/combat-cinematics.js','utf8');
 assert.ok(runtime.includes('actor.howlCapabilities'));
 assert.ok(runtime.includes('jawBone'));
 assert.ok(runtime.includes('morphTargetDictionary'));
 assert.ok(runtime.includes('actor.resetHowlFace()'));
 assert.ok(runtime.includes('cinematics.bearHowl(t)'));
 assert.ok(audio.includes("case 'bearHowl'"));
 assert.ok(overlay.includes("window.NoahsAudio?.cue('bearHowl')"));
});

test('signature finish adds a rush cut, low technique sweep and ground shockwave',()=>{
 const evt={...base,attackerId:'bear',defenderId:'moose',move:'P'};
 const timing=director.duration(evt,1600);
 assert.equal(director.shot(evt,timing.actionLead+timing.contact*.85,1600).shot,'rush');
 assert.equal(director.shot({...evt,move:'T'},
    director.duration({...evt,move:'T'},1600).actionLead+
    director.duration({...evt,move:'T'},1600).contact*.85,1600).shot,'sweep');
 const arenaCode=readFileSync('src/arena3d-runtime.js','utf8');
 const css=readFileSync('src/combat-cinematics.css','utf8');
 assert.ok(arenaCode.includes('new THREE.RingGeometry'));
 assert.ok(arenaCode.includes('shockMaterial.opacity'));
 assert.ok(css.includes('[data-shot="rush"]'));
 assert.ok(css.includes('[data-shot="sweep"]'));
});

test('Guts, Technique, Power and Special have individually directed preparation shots',()=>{
 const names=[];
 const focusCameras={};
 for(const move of ['G','T','P','S']){
   const evt={...base,attackerId:'bear',defenderId:'moose',move};
   const cam=director.camera(evt,100,1600);
   assert.equal(cam.beat,'FOCUS');
   focusCameras[move]=cam;
   names.push(director.panel(evt,100,1600).title);
 }
 assert.equal(new Set(names).size,4,'Each attack has a name during anticipation');
 assert.ok(focusCameras.T.y<focusCameras.G.y,
   'Low swipe camera should be lower than the charge preparation');
 assert.ok(focusCameras.P.y>focusCameras.T.y+1,
   'Power should build with a raised upper-body camera');
 assert.ok(focusCameras.P.x!==focusCameras.G.x,
   'Power and Guts must not share a generic muzzle closeup');
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 assert.ok(runtime.includes('new THREE.InstancedMesh'),'Environment depth should be efficient');
 assert.ok(runtime.includes('scene.add(trunks,crowns)'),'Distant trees ground the scene');
 assert.ok(runtime.includes('new THREE.DodecahedronGeometry'),'Rocks make the stage less empty');
});

test('the winning Bear howl is staged without hiding its muzzle',()=>{
 const css=readFileSync('src/combat-cinematics.css','utf8');
 const ui=readFileSync('src/combat-cinematics.js','utf8');
 assert.ok(css.includes('ark-bear-howl-wave'));
 assert.ok(ui.includes('ark-cinema-howl-waves'));
 assert.ok(ui.includes('overlay.dataset.winner=event.attackerId'));
});
