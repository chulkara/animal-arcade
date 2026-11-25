import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const director=require('../src/combat-cinematics-core.js');
const arena=require('../src/arena3d-core.js');
// film:false → the shared-frame fallback grammar; attack-film tests opt in.
const base={attacker:0,defender:1,attackerId:'moose',defenderId:'bear',
 move:'P',finished:false,damage:48,knockout:false,miracleName:null,film:false};

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

test('victory follows the reference: four quick cuts of the four-paw winner, then the sky outro',()=>{
 const evt={...base,attacker:1,defender:0,attackerId:'bear',
  defenderId:'moose',move:'G',knockout:true,finished:true};
 const start=director.duration(evt,1000).victoryStart;
 const shots=[start+50,start+700,start+1300,start+2000].map(ms=>director.shot(evt,ms,1000));
 assert.deepEqual(shots.map(s=>s.beat),['VICTORY','VICTORY','VICTORY','VICTORY']);
 assert.deepEqual(shots.map(s=>s.shot),['vicSide','vicFront','vicRoar','vicWide']);
 const cameras=shots.map(s=>director.camera(evt,start+s.local,1000));
 assert.equal(new Set(cameras.map(c=>Math.atan2(c.x-c.targetX,c.z-c.targetZ).toFixed(2))).size,4,'four distinct directions');
 assert.equal(director.camera(evt,start+2000,1000).outro,0);
 assert.ok(director.camera(evt,start+director.VICTORY_OUTRO_MS+500,1000).outro>.99,'sky outro after the cuts');
 assert.ok(director.VICTORY_END_MS<=5000,'no long static victory footage');
 assert.ok(director.VICTORY_BANNER_MS<=400,'You win! lands within ~0.3 s');
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
 assert.ok(model.includes("defender?.native(sequence.solo||!event.knockout?'hit':'knockout')"));
 assert.ok(model.includes("defender.native(event.knockout?'knockout':'hit',.06)"),'film victims react on landing');
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


test('regression: the winner walks toward centre and the lens and every cut tracks it',()=>{
 for(const attacker of [0,1]){
  const evt={...base,attacker,defender:1-attacker,
   attackerId:'bear',defenderId:'moose',move:'P',finished:true,knockout:true};
  const begin=director.duration(evt,1200).victoryStart;
  const home=attacker===0?-2.02:2.02,facing=attacker===0?1:-1;
  for(const t of [100,700,1300,2000]){
   const cam=director.camera(evt,begin+t,1200),ap=director.victoryApproach(t);
   assert.equal(cam.beat,'VICTORY');
   assert.ok(Math.abs(cam.targetX-(home+facing*ap.travel))<1e-9,'Camera tracks the winner');
   assert.ok(Math.abs(cam.targetX)<=2.02,'Approach moves toward centre, never away');
   assert.ok(Math.hypot(cam.x-cam.targetX,cam.z-cam.targetZ)>=2.5,'camera never inside the winner');
   assert.equal(cam.cut,true);
  }
  assert.ok(director.victoryApproach(2300).depth>1,'walks toward the lens');
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
 assert.ok(source.includes('actor.victoryGesture=(elapsed,nativeRoar=false)=>'));
 assert.ok(source.includes("winner.victoryGesture(sequence.elapsed-start,Boolean(sequence.roarPlayed))"));
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
  if(t.solo){ // solo attacks prepare with a title card instead
   assert.equal(director.shot(event,t.actionLead-10,1300).beat,'TITLE');
   assert.equal(director.shot(event,t.actionLead+t.contact+25,1300).beat,'CONTACT');
   continue;
  }
  assert.equal(director.shot(event,t.actionLead-10,1300).beat,'FOCUS');
  assert.equal(director.shot(event,t.actionLead+20,1300).beat,'INTRO');
  assert.equal(director.shot(event,t.actionLead+t.contact+25,1300).beat,'CONTACT');
 }
 const event={...base,attacker:0,defender:1,attackerId:'bear',
  defenderId:'moose',move:'P',finished:true};
 const begin=director.duration(event,1300).victoryStart;
 const portrait=director.camera(event,begin+1300,1300);
 assert.equal(portrait.shot,'vicRoar','the win closes on the roaring face');
 assert.ok(Math.hypot(portrait.x-portrait.targetX,portrait.z-portrait.targetZ)>=2.5,
    'The winning camera must stay outside the Bear torso');
  assert.ok(portrait.zoom<=1.08);
  const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 const ui=readFileSync('src/combat-cinematics.js','utf8');
 assert.ok(runtime.includes('const lead=timing?.actionLead||0;'),
  'The native source clip must wait until cinematic focus concludes');
 assert.ok(runtime.includes("attacker.native(attacker.asset?.clips?.walk?'walk':'idle',.2)"),
  'The winner stays on four paws and walks in');
 assert.ok(ui.includes("'You win!'")&&ui.includes('PERFECT!'));
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

test('bear win has a visible inhale followed by a head-raised roar on the close-up',()=>{
 const none=director.bearHowl(director.VICTORY_HOWL_START_MS-1);
 assert.equal(none.active,false);
 assert.equal(none.jawOpen,0);
 const inhale=director.bearHowl(director.VICTORY_HOWL_START_MS+150);
 assert.equal(inhale.phase,'inhale');
 assert.ok(inhale.headPitch>.05,'First gather breath by lowering the head');
 const roaring=director.bearHowl(1500);
 assert.equal(roaring.phase,'roar');
 assert.ok(roaring.headPitch<-.15,'Then lift the head visibly');
 assert.ok(roaring.neckPitch<-.15);
 assert.ok(roaring.jawOpen>.8);
 // the jaw is open on the roar close-up cut
 const [,roarAt]=director.VICTORY_SHOTS.find(([n])=>n==='vicRoar');
 assert.ok(director.bearHowl(roarAt+200).jawOpen>.5);
 assert.ok(director.VICTORY_HOWL_CUE_MS>=roarAt-100&&director.VICTORY_HOWL_CUE_MS<=roarAt+300,'roar sound with the close-up');
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
 const evt={...base,attackerId:'bear',defenderId:'moose',move:'G'};
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
 assert.ok(runtime.includes('ground.receiveShadow=true'),'Keep a genuine ground contact plane');
 assert.ok(!runtime.includes('scene.add(trunks,crowns)'),
   'Remove distracting geometry added after the better 9:13 AM footage');
});

test('the winning Bear howl is staged without hiding its muzzle',()=>{
 const css=readFileSync('src/combat-cinematics.css','utf8');
 const ui=readFileSync('src/combat-cinematics.js','utf8');
 assert.ok(css.includes('ark-bear-howl-wave'));
 assert.ok(ui.includes('ark-cinema-howl-waves'));
 assert.ok(ui.includes('overlay.dataset.winner=event.attackerId'));
});

test('9:49 AM regression: victory cameras stay outside the winner and are fitted to its live skeleton',()=>{
 for(const slot of [0,1]){
  const event={...base,attacker:slot,defender:1-slot,attackerId:'bear',
   defenderId:'moose',move:'P',finished:true,knockout:true};
  const begin=director.duration(event,1600).victoryStart;
  for(const offset of [80,700,1300,2000]){
    const view=director.camera(event,begin+offset,1600);
    const dist=Math.hypot(view.x-view.targetX,view.y-view.targetY,view.z-view.targetZ);
    assert.ok(dist>=3,'Victory film camera cannot be inside the winning Bear');
    assert.ok(view.zoom<=1.08,'Cinematic zoom must preserve body visibility');
  }
 }
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 assert.ok(runtime.includes('function fitVictoryInFrame(event,wants)'));
 assert.ok(runtime.includes('joint.getWorldPosition(v)'));
 assert.ok(runtime.includes('v.clone().project(filmCamera)'));
});

test('9:49 AM regression: film cleanup removes residual LOW SWIPE overlays',()=>{
 const source=readFileSync('src/combat-cinematics.js','utf8');
 assert.ok(source.includes('overlay?.remove()'));
 assert.ok(source.includes("ui.querySelectorAll('.combat-battlefield .ark-cinema')"));
 assert.ok(source.includes("battlefield.querySelectorAll('.ark-cinema')"));
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 assert.ok(!runtime.includes('scene.add(trunks,crowns)'));
 assert.ok(!runtime.includes('new THREE.DodecahedronGeometry'));
});


test('completed Bear review holds the correct winner title instead of reverting to stale move text',()=>{
 const ui=readFileSync('src/combat-cinematics.js','utf8');
 assert.ok(ui.includes('const holdWinner=rehearsal&&event.finished'));
 assert.ok(ui.includes("overlay.dataset.beat=holdWinner?'victory':'done'"));
 assert.ok(ui.includes("if(holdWinner)stage.dataset.cineBeat='victory'"));
 assert.ok(ui.includes("'P'+(event.attacker+1)+' wins!'"));
});

test('attack closing is a bounded curve that returns to the start mark',()=>{
 for(const attackerId of ['bear','moose'])for(const move of ['G','T','P','S']){
  const keep=director.contactKeep(attackerId,move);
  assert.ok(keep>0&&keep<2,'keep gap must be a sane world distance');
  const evt={attacker:attackerId==='bear'?0:1,defender:attackerId==='bear'?1:0,attackerId,defenderId:attackerId==='bear'?'moose':'bear',move,damage:10};
  const t=director.duration(evt,1200);
  assert.equal(director.blocking(evt,0,1200).closing,0,'no closing before the windup');
  const at=director.blocking(evt,t.actionLead+t.contact,1200).closing;
  assert.ok(at>.95,'fully closed at contact');
  assert.ok(director.blocking(evt,t.actionLead+t.contact+900,1200).closing<.01,'withdrawn after recoil');
 }
});

test('knockout drives the loser back and keeps it there',()=>{
 const evt={attacker:0,defender:1,attackerId:'bear',defenderId:'moose',move:'P',damage:40,finished:true,knockout:true};
 const t=director.duration(evt,1200),hit=t.actionLead+t.contact;
 assert.equal(director.blocking(evt,hit-10,1200).defenderKnock,0);
 const late=director.blocking(evt,hit+2000,1200);
 assert.ok(late.defenderKnock>.7,'held, not bounced back');
 assert.ok(late.defenderTravel<.01,'ordinary hits still return');
});

test('measured clip contact replaces the ratio guess and can be cleared',()=>{
 const evt={attacker:0,defender:1,attackerId:'bear',defenderId:'moose',move:'S',damage:10};
 const guess=director.duration(evt,1833).contact;
 assert.ok(director.setMeasuredContact('bear','S',900));
 assert.equal(director.duration(evt,1833).contact,900);
 assert.equal(director.duration(evt,undefined).contact,director.duration(evt).contact,'placeholder path ignores measurements');
 director.clearMeasuredContacts();
 assert.equal(director.duration(evt,1833).contact,guess);
 assert.equal(director.setMeasuredContact('tiger','P',900),false);
});

test('High Paw Strike restaging: slower wind-up, snapped strike, lingering impact, shorter overall',()=>{
 const st=director.staging('bear','P',983,3000);
 assert.ok(st);
 const windupReal=st.realAt(st.windupEnd),strikeReal=st.realContact-windupReal;
 assert.ok(windupReal>st.windupEnd*1.3,'wind-up plays slower than the source');
 assert.ok(strikeReal<(st.contact-st.windupEnd)*.7,'strike plays faster than the source');
 assert.ok(st.realLength<3000,'recovery is brisker so the move is shorter overall');
 assert.equal(st.speedAt(st.contact+50),st.segments[2].speed,'impact linger');
 director.setMeasuredContact('bear','P',983);
 const evt={attacker:0,defender:1,attackerId:'bear',defenderId:'moose',move:'P',damage:30};
 assert.equal(director.duration(evt,3000).contact,st.realContact,'director uses real (warped) contact');
 assert.equal(director.duration(evt,3000).attack,st.realLength);
 director.clearMeasuredContacts();
 assert.equal(director.staging('bear','S',900,1833),null,'only listed moves are restaged');
 const mo=director.staging('moose','G',830,1450);
 assert.equal(Math.round(mo.clipAt(mo.realContact)),830,'moose real→clip mapping lands on the authored contact frame');
 const low=director.staging('bear','T',850,4000);
 assert.ok(low.realLength<2500,'Low Swipe no longer idles through a 4 s recovery');
});

test('after an ordinary exchange the camera settles back to the two-shot',()=>{
 const evt={attacker:0,defender:1,attackerId:'bear',defenderId:'moose',move:'G',damage:30,finished:false,knockout:false};
 const t=director.duration(evt,1833);
 const held=director.camera(evt,t.finish+300,1833);
 assert.equal(held.targetX,0);assert.equal(held.x,0);
 const reacting=director.camera(evt,t.actionLead+t.contact+400,1833);
 assert.notEqual(reacting.targetX,0,'reaction shot still favours the defender');
});

test('key poses: neutral at the ends, distinct silhouettes at wind-up and contact',()=>{
 const cases=[['G',1083,1833],['T',850,4000],['P',983,3000]];
 for(const [move,c,len] of cases){
  const st=director.staging('bear',move,c,len);
  const zero=director.keyPose('bear',move,0,st);
  assert.ok(Object.values(zero).every(v=>v===0),move+' starts neutral');
  assert.ok(Object.values(director.keyPose('bear',move,len,st)).every(v=>v===0),move+' ends neutral');
  const wind=director.keyPose('bear',move,st.windupEnd,st),hit=director.keyPose('bear',move,st.contact,st);
  const diff=director.POSE_FIELDS.reduce((s,f)=>s+Math.abs(wind[f]-hit[f]),0);
  assert.ok(diff>.4,move+' wind-up and contact shapes are clearly different');
  // smooth: no jump across a key time
  for(const t of [st.windupEnd,st.contact,st.holdEnd]){
   const a=director.keyPose('bear',move,t-.5,st),b=director.keyPose('bear',move,t+.5,st);
   for(const f of director.POSE_FIELDS)assert.ok(Math.abs(a[f]-b[f])<.01,move+' '+f+' continuous');
  }
 }
 const P=director.staging('bear','P',983,3000);
 assert.ok(director.keyPose('bear','P',P.windupEnd,P).spine1>.12,'High Paw Strike rears tall');
 assert.ok(director.keyPose('bear','P',P.contact,P).chest<-.1,'then drives the chest down');
 assert.ok(Object.values(director.keyPose('moose','G',500,null)).every(v=>v===0),'no keys → neutral');
});

test('solo attack (Bear High Paw Strike) follows the arcade reference film grammar',()=>{
 director.setMeasuredContact('bear','P',983);
 for(const attacker of [0,1]){
  const evt={...base,film:true,attacker,defender:1-attacker,attackerId:'bear',defenderId:'moose',move:'P',damage:30,knockout:false,finished:false};
  const t=director.duration(evt,3000);
  assert.ok(t.solo&&t.titleIn<t.actionLead&&t.actionLead+t.contact<t.launchAt&&t.launchAt<t.landAt&&t.landAt<t.returnAt&&t.returnAt<t.finish);
  const order=[];
  for(let ms=0;ms<t.total;ms+=20){const b=director.shot(evt,ms,3000).beat;if(order.at(-1)!==b)order.push(b);}
  assert.deepEqual(order,['FOCUS','TITLE','ATTACK','CONTACT','LAUNCH','IMPACT','REACTION']);
  // the two animals never share the frame between the title and the return
  const v=ms=>director.soloView(evt,ms,3000);
  assert.equal(v(t.titleIn+300).showDefender,false);
  assert.equal(v(t.actionLead+t.contact).showDefender,false);
  assert.equal(v(t.launchAt+300).showAttacker,false);
  assert.ok(v(t.finish-10).showAttacker&&v(t.finish-10).showDefender);
  // reference shot order inside the strike
  const shots=[];for(let ms=t.actionLead;ms<t.launchAt;ms+=10){const n=director.shot(evt,ms,3000).shot;if(shots.at(-1)!==n)shots.push(n);}
  assert.deepEqual(shots,['soloRise','soloRear','soloFire','lunge']);
  // aura during the title, fire behind the strike, glint before the lunge, flash after it
  assert.ok(v(t.titleIn+400).aura>.9&&v(t.titleIn+400).fire===0);
  assert.ok(v(t.actionLead+t.contact).fire>.9);
  assert.ok(v(t.actionLead+t.lungeAt-50).glint>.9,'claw glint at the top of the swing');
  assert.ok(v(t.actionLead+t.contact+50).flash>.9);
  assert.ok(v(t.actionLead+t.contact-1).lunge>.9,'lunges into the lens before the flash');
  assert.ok(v(t.titleIn+1).burst>.9&&v(t.actionLead-1).flash>.9,'title opens on a burst, closes to white');
  assert.equal(director.hitStop(evt,t.actionLead+t.contact+60,3000),true);
  assert.equal(director.hitStop(evt,t.actionLead+t.contact+director.SOLO_MS.hitStop,3000),false);
  // the stage never changes: only the launch is re-lit red
  assert.equal(v(t.titleIn+300).stage,null);
  assert.equal(v(t.launchAt+100).stage,'red');
  // the victim is already airborne and turning over on the launch's first frame
  const first=v(t.launchAt).launch;
  assert.ok(first.y>1&&Math.abs(first.spin)>1.5,'tumbling from frame one');
  const peak=v((t.launchAt+t.landAt)/2).launch;
  assert.ok(peak.y>2);
  assert.equal(Math.sign(peak.drift),attacker===0?1:-1);
  assert.equal(v(t.landAt+300).launch.y,0);
  assert.equal(v(t.landAt+10).launch.landed,true);
  assert.equal(v(t.landAt+10).pops,1,'one damage number pops on landing');
  assert.equal(v(t.landAt+director.SOLO_MS.pop+10).pops,0,'and expires');
  // cameras: title is a low profile on the attacker's own slot; launch tracks the victim
  const sx=attacker===0?-2.02:2.02;
  assert.equal(director.camera(evt,t.titleIn+300,3000).targetX,sx+(attacker===0?.35:-.35));
  const lc=director.camera(evt,(t.launchAt+t.landAt)/2,3000);
  assert.ok(lc.targetY>2,'launch camera follows the airborne victim');
  assert.equal(lc.snap,true);
  assert.equal(director.panel(evt,t.titleIn+300,3000).sub,'LV.2 SIGNATURE');
 }
 // every Bear and Moose move is a film; film:false keeps the shared-frame fallback
 for(const id of ['bear','moose'])for(const move of ['G','T','P','S'])
  assert.equal(director.duration({...base,film:true,attackerId:id,defenderId:id==='bear'?'moose':'bear',move},1833).solo,true);
 assert.equal(director.duration({...base,attackerId:'bear',defenderId:'moose',move:'G'},1833).solo,undefined);
 assert.equal(director.duration({...base,film:true,attackerId:'bear',defenderId:'moose',move:'G'},1833).strike,'charge');
 assert.equal(director.duration({...base,film:true,attackerId:'bear',defenderId:'moose',move:'T'},1833).strike,'slash');
 director.clearMeasuredContacts();
});
