import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const core=require('../src/arena3d-core.js');
const fake=(name,size=512)=>({name,size});

test('Bear V2 manifest requires approved native attack, hit, KO and brown coat',()=>{
 const spec=core.REQUIRED.bear;
 const files=[spec.base,...Object.values(spec.motions),...Object.values(spec.textures)].map(name=>fake(name));
 const plan=core.planFiles('bear',files);
 assert.equal(plan.ready,true);assert.deepEqual(plan.missing,[]);
 assert.equal(Object.keys(plan.clips).length,9);
 assert.equal(plan.textures.body.name,'Bear Body 2.png');
 assert.equal(plan.count,files.length);
 assert.deepEqual(core.planFiles('bear',files.filter(f=>f.name!=='Bear Body 2.png')).missing,['Bear Body 2.png']);
});

test('Moose V2 requires native Idle/Run/Jump/Hit/KO and warm head, body, antler texture',()=>{
 const spec=core.REQUIRED.moose;
 const files=[spec.base,...Object.values(spec.motions),...Object.values(spec.textures)].map(name=>fake(name));
 const plan=core.planFiles('moose',files);
 assert.equal(plan.ready,true);assert.deepEqual(plan.missing,[]);
 assert.equal(plan.textures.antlers.name,'Moose Horn.png');
 assert.equal(plan.clips.jump.name,'JumpStand.FBX');
});

test('local asset selection rejects duplicates, oversized source and unwanted bytes',()=>{
 assert.equal(core.basename('C:\\Moose 1.0\\Moose Animated.fbx'),'moose animated.fbx');
 assert.equal(core.basename('folder/sub/Stand_Idle_01.FBX'),'stand_idle_01.fbx');
 assert.throws(()=>core.planFiles('bear',[fake('Idle.fbx'),fake('idle.FBX')]),/Duplicate asset name/);
 assert.throws(()=>core.planFiles('bear',[fake('Bear Animated.fbx',core.MAX_FILE+1)]),/oversized/);
 assert.throws(()=>core.planFiles('moose',[fake('garbage.zip',core.MAX_TOTAL+1)]),/310 MB limit/);
 assert.equal(core.planFiles('bear',[fake('notes.txt')]).ready,false);
 assert.throws(()=>core.planFiles('tiger',[]),/Unknown private animal/);
});

test('battle hit provides stable animation event, defender recoil and special/KO cue',()=>{
 const regular={phase:'RESULT',round:2,session:{bout:1},
   animals:[{id:'bear',hp:91},{id:'moose',hp:54}],
   lastEvent:{kind:'HIT',attacker:0,defender:1,technique:'T',
     special:false,damage:24,remainingHp:54}};
 const ev=core.battleEvent(regular);
 assert.equal(ev.move,'T');assert.equal(ev.attackerId,'bear');
 assert.equal(ev.defenderId,'moose');assert.equal(ev.knockout,false);
 assert.deepEqual(core.battleEvent({...regular,lastEvent:{kind:'TIE'}}),null);
 const special=core.battleEvent({...regular,phase:'FINISHED',
   animals:[{id:'bear',hp:91},{id:'moose',hp:0}],
   lastEvent:{...regular.lastEvent,remainingHp:0,special:true}});
 assert.equal(special.move,'S');assert.equal(special.knockout,true);
 assert.equal(special.finished,true);assert.notEqual(special.key,ev.key);
 assert.equal(core.battleEvent({...regular,phase:'ATTACK'}),null);
});

test('reviewed motion timing stays distinctive and asset scripts do not ship FBX bytes',()=>{
 assert.ok(core.contactMs('moose','P',500)>core.contactMs('moose','T',500));
 assert.ok(core.contactMs('moose','S',500)>core.contactMs('moose','G',500));
 assert.ok(core.contactMs('bear','G',1000)>=180);
 assert.equal(core.actionDuration('moose','P'),1840);
 assert.equal(core.actionDuration('moose','S'),2280);
 assert.ok(core.settleMs('moose','S')>2280,'Special must not return to Idle before landing');
 assert.ok(core.settleMs('bear','G',1800)>1800,'Bear native strike must finish before victory transition');
 assert.throws(()=>core.contactMs('moose','Q'),RangeError);
 const html=readFileSync('index.html','utf8');
 const script=readFileSync('src/arena3d-runtime.js','utf8');
 assert.ok(html.includes('src/arena3d-runtime.js'));
 assert.ok(html.includes('src/arena3d-loader.js'));
 assert.ok(html.includes('src/arena3d.css'));
 assert.ok(script.includes('window.NoahsMooseActionCore.sampleMove('));
 assert.ok(script.includes('new THREE.AnimationMixer('));
 assert.ok(script.includes("data-ark3d-folder"));
 assert.ok(readFileSync('src/painted-menu.js','utf8').includes("const ART='./assets/approved-menu.png'"));
});

test('3D asset material binding scripts load before the FBX importer',()=>{
 const html=readFileSync('index.html','utf8');
 const loader=readFileSync('src/arena3d-loader.js','utf8');
 const loadOrder=[
   'src/bear-material-core.js',
   'src/moose-assets-core.js',
   'src/arena3d-core.js',
   'src/arena3d-loader.js',
   'src/arena3d-runtime.js'
 ].map(src=>html.indexOf('src="./'+src));
 assert.ok(loadOrder.every(index=>index!==-1),'3D dependency script is missing from the page');
 assert.ok(loadOrder.every((index,i)=>i===0||loadOrder[i-1]<index),
   '3D material helpers must load before the FBX loader');
 const bear=require('../src/bear-material-core.js');
 const moose=require('../src/moose-assets-core.js');
 assert.equal(bear.materialRole('Material_003',0),'body');
 assert.equal(bear.materialRole('Material_001',1),'head');
 assert.equal(bear.materialRole('Material_002',2),'teeth');
 assert.equal(moose.roleFor('Chifre_Moose','Moose_Chifre',0),'antlers');
 assert.match(loader,/material mapping script did not load/);
});

test('optional angry stance and rear transition load from local folders without becoming required',()=>{
 const spec=core.REQUIRED.bear;
 const required=[spec.base,...Object.values(spec.motions),...Object.values(spec.textures)]
   .map(name=>fake(name));
 const original=core.planFiles('bear',required);
 assert.equal(original.ready,true);
 assert.equal(original.clips.rear,undefined);
 assert.equal(original.clips.angry,undefined);
 const complete=core.planFiles('bear',required.concat([
   fake(core.OPTIONAL.bear.rear),fake(core.OPTIONAL.bear.angry)
 ]));
 assert.equal(complete.ready,true);
 assert.equal(complete.clips.rear.name,'Trans_Stand_to_StandHind.FBX');
 assert.equal(complete.clips.angry.name,'StandAngry_Breathing_01.FBX');
 assert.deepEqual(complete.missing,[]);
});
