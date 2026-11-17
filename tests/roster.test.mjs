import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const roster=require('../src/roster-core.js');
const cards=require('../src/cards-core.js');
const combat=require('../src/combat-engine.js');
const bear=require('../src/bear-motion-core.js');
const moose=require('../src/moose-action-core.js');
const mooseAssets=require('../src/moose-assets-core.js');

test('only approved Bear and Moose are active, menu artwork stays unchanged',()=>{
 assert.deepEqual(roster.ids,['bear','moose']);
 assert.equal(roster.opponentOf('bear'),'moose');
 assert.equal(roster.opponentOf('moose'),'bear');
 assert.throws(()=>roster.opponentOf('tiger'),RangeError);
 assert.deepEqual(cards.CARDS.filter(c=>c.type==='animal').map(c=>c.animalId),roster.ids);
 const menu=readFileSync('src/painted-menu.js','utf8');
 assert.ok(menu.includes("const ART='./assets/approved-menu.png'"));
 assert.ok(!readFileSync('src/prototype.js','utf8').includes("tiger"));
});
test('bear native clips and moose V2 prototype cues map to moves and reactions',()=>{
 for(const tech of ['G','T','P']){
  const b=roster.motionFor('bear',{technique:tech});
  assert.equal(b.kind,'native');
  assert.equal(b.file,bear.CLIPS[{G:'guts',T:'technique',P:'power'}[tech]].file);
  const m=roster.motionFor('moose',{technique:tech});
  assert.equal(m.kind,'procedural');
  assert.ok(moose.MOVES[m.move]);
 }
 assert.equal(roster.motionFor('bear',{technique:'T',special:true}).file,bear.CLIPS.special.file);
 assert.equal(roster.motionFor('moose',{technique:'T',special:true}).move,'Special');
 assert.equal(roster.motionFor('bear',{reaction:'knockout'}).file,bear.CLIPS.knockout.file);
 assert.equal(roster.motionFor('moose',{reaction:'knockout'}).file,mooseAssets.CLIPS.Knockout);
});
test('legacy Tiger/Lion local save keeps earned cards and upgrades retired Animal IDs',()=>{
 const storage={data:new Map(),getItem(k){return this.data.get(k)||null;},
   setItem(k,v){this.data.set(k,v);}};
 const legacy={schema:1,inventory:{'animal:tiger':3,'animal:lion':2,'strong:wind':1},
   decks:{p1:{animal:'animal:tiger',strong:'strong:wind',miracle:'miracle:dawn'},
     p2:{animal:'animal:lion',strong:'strong:guard',miracle:'miracle:dawn'}},
   wins:12,lastReward:'animal:tiger'};
 storage.setItem(cards.KEY,JSON.stringify(legacy));
 const db=cards.createStore(storage);
 assert.equal(db.getState().inventory['animal:bear'],3);
 assert.equal(db.getState().inventory['animal:moose'],2);
 assert.equal(db.getDeck('p1').animal,'animal:bear');
 assert.equal(db.getDeck('p2').animal,'animal:moose');
 assert.equal(db.getDeck('p1').strong,'strong:wind');
 assert.equal(db.getState().wins,12);
 assert.equal(db.getState().lastReward,'animal:bear');
 assert.ok(!Object.hasOwn(db.getState().inventory,'animal:tiger'));
});
test('match rejects retired animals and accepts both mirror and mixed rosters',()=>{
 assert.deepEqual(combat.createBattle().getState().animals.map(a=>a.id),['bear','moose']);
 assert.deepEqual(combat.createBattle({picks:['moose','moose']}).getState().animals.map(a=>a.id),['moose','moose']);
 assert.throws(()=>combat.createBattle({picks:['tiger','lion']}),/valid animals/);
});
