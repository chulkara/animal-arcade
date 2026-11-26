import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const bear=require('../src/bear-review-core.js');
const cinema=require('../src/combat-cinematics-core.js');

const state=()=>({phase:'ATTACK',round:1,
 animals:[{id:'bear',hp:180},{id:'moose',hp:180}],
 history:[],selected:[{technique:null,power:null},{technique:null,power:null}]});

test('Bear review is a fixed Guts, Technique, Power then victory rehearsal',()=>{
 const s=state(),before=JSON.stringify(s),events=bear.events(s);
 assert.deepEqual(bear.MOVES,['G','T','P']);
 assert.deepEqual(events.map(e=>e.move),['G','T','P']);
 assert.equal(events.length,3);
 assert.equal(new Set(events.map(e=>e.key)).size,3);
 assert.deepEqual(events.map(e=>e.finished),[false,false,true]);
 assert.deepEqual(events.map(e=>e.knockout),[false,false,true]);
 assert.ok(events.every(e=>e.review&&e.damage===0&&e.attackerId==='bear'&&e.defenderId==='moose'));
 assert.equal(JSON.stringify(s),before,'review generation must never change the real battle');
 assert.match(bear.label(0),/GUTS/);
 assert.match(bear.label(1),/TECHNIQUE/);
 assert.match(bear.label(2),/VICTORY/);
});

test('Bear review reuses the same native action timing for any opponent and player slot',()=>{
 const right=state();right.animals.reverse();
 const events=bear.events(right);
 assert.equal(events[0].attacker,1);
 assert.equal(events[0].defender,0);
 assert.equal(events[2].finished,true);
 assert.deepEqual(events.map(e=>cinema.spec(e.attackerId,e.move).name),
   ['FERAL CHARGE','LOW SWIPE','HIGH PAW STRIKE']);
 const end=cinema.duration(events[2],1250);
 assert.ok(end.total>end.victoryStart);
 assert.equal(cinema.shot(events[2],end.victoryStart+1080,1250).shot,'vicHold');
 const mirror=state();mirror.animals[1].id='bear';
 assert.equal(bear.events(mirror)[0].defenderId,'bear');
});

test('rehearsal rejects invalid rosters and indexes instead of silently changing selection',()=>{
 assert.throws(()=>bear.events({animals:[]}),/two-animal battle/);
 assert.throws(()=>bear.events({animals:[{id:'moose'},{id:'moose'}]}),/Brown Bear/);
 assert.throws(()=>bear.label(3),RangeError);
 assert.throws(()=>bear.label(-1),RangeError);
});

test('Bear review is loaded and wired to the real private 3D actors without scoring',()=>{
 const html=readFileSync('index.html','utf8');
 const runtime=readFileSync('src/arena3d-runtime.js','utf8');
 const cinemaUi=readFileSync('src/combat-cinematics.js','utf8');
 const combatUi=readFileSync('src/combat-ui.js','utf8');
 assert.ok(html.includes('src/bear-review-core.js'));
 assert.ok(html.indexOf('src/bear-review-core.js')<html.indexOf('src/arena3d-runtime.js'));
 assert.ok(runtime.includes('function startBearReview()'));
 assert.ok(runtime.includes('function advanceBearReview(delta)'));
 assert.ok(runtime.includes('startBearReviewStep(bearReview.index+1)'));
 assert.ok(runtime.includes('data-bear-review-replay'));
 assert.ok(runtime.includes('data-bear-review-stop'));
 assert.ok(runtime.includes('reviewChange()'));
 assert.ok(cinemaUi.includes("arkade:bearreviewchange"));
 assert.ok(combatUi.includes("getReviewState?.()?.active"));
 assert.ok(readFileSync('src/painted-menu.js','utf8').includes("const ART='./assets/approved-menu.png'"));
});
