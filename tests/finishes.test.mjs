import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const cards=require('../src/cards-core.js');

const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};

test('finishes: Standard plus three rare ones, Chrome rarest, Porcelain rarer than Doodle',()=>{
  assert.deepEqual(cards.FINISH_IDS,['standard','doodle','porcelain','chrome']);
  const odds=Object.fromEntries(cards.FINISHES.map(f=>[f.id,f.odds]));
  assert.ok(odds.chrome<odds.porcelain&&odds.porcelain<odds.doodle);
  // the roll bands: rarest first
  assert.equal(cards.rollFinish(0),'chrome');
  assert.equal(cards.rollFinish(odds.chrome-1e-9),'chrome');
  assert.equal(cards.rollFinish(odds.chrome),'porcelain');
  assert.equal(cards.rollFinish(odds.chrome+odds.porcelain),'doodle');
  assert.equal(cards.rollFinish(odds.chrome+odds.porcelain+odds.doodle),null);
  // over many uniform rolls the shares match the odds
  const n=100000,count={doodle:0,porcelain:0,chrome:0,null:0};
  for(let i=0;i<n;i++)count[cards.rollFinish((i+.5)/n)]++;
  for(const id of ['doodle','porcelain','chrome'])assert.ok(Math.abs(count[id]/n-odds[id])<.001,id);
});

test('a won match can grant a finish for the animal that fought; no duplicates',()=>{
  const store=cards.createStore(memory());
  assert.deepEqual(store.getState().finishes['animal:bear'],[]);
  assert.equal(store.grantFinish('bear',()=>.99),null,'most wins drop nothing');
  const chrome=store.grantFinish('bear',()=>0);
  assert.deepEqual(chrome,{card:'animal:bear',animalId:'bear',finish:'chrome',name:'CHROME'});
  assert.equal(store.grantFinish('bear',()=>0),null,'already owned');
  store.grantFinish('bear',()=>.05);
  assert.deepEqual(store.getState().finishes['animal:bear'],['porcelain','chrome'],'kept in rarity order');
  assert.deepEqual(store.getState().finishes['animal:moose'],[]);
  assert.deepEqual(store.getState().lastFinish,{card:'animal:bear',finish:'porcelain'});
  assert.equal(store.grantFinish('tiger',()=>0),null);
});

test('only an owned finish can be worn, and only by the animal that owns it',()=>{
  const store=cards.createStore(memory());
  assert.equal(store.setFinish('p1','chrome'),false,'not owned');
  store.grantFinish('bear',()=>0);
  assert.equal(store.setFinish('p1','chrome'),true);
  assert.equal(store.getFinish('p1','bear'),'chrome');
  assert.equal(store.getFinish('p1','moose'),'standard','a different animal in battle wears nothing');
  assert.equal(store.getFinish('p2','moose'),'standard');
  // switching the P1 animal drops a finish that animal does not own
  store.equip('p1','animal:shark');
  assert.equal(store.getDeck('p1').finish,undefined);
  store.equip('p1','animal:bear');assert.equal(store.getFinish('p1','bear'),'standard');
  store.setFinish('p1','chrome');assert.equal(store.setFinish('p1','standard'),true);
  assert.equal(store.getFinish('p1','bear'),'standard');
  assert.equal(store.setFinish('p3','chrome'),false);assert.equal(store.setFinish('p1','gold'),false);
  // finishes never touch the rules
  store.setFinish('p1','chrome');
  assert.deepEqual(store.getModifiers('p1','bear'),cards.createStore(memory()).getModifiers('p1','bear'));
});

test('finishes survive export/import, and a tampered save is cleaned',()=>{
  const store=cards.createStore(memory());
  store.grantFinish('shark',()=>.03);store.equip('p2','animal:shark');store.setFinish('p2','porcelain');
  const copy=cards.createStore(memory());
  assert.equal(copy.importSave(store.exportSave()),true);
  assert.deepEqual(copy.getState().finishes['animal:shark'],['porcelain']);
  assert.equal(copy.getFinish('p2','shark'),'porcelain');
  const raw=JSON.parse(store.exportSave());
  raw.finishes['animal:shark']=['porcelain','porcelain','gold','<script>',7];
  raw.finishes['animal:tiger']=['chrome'];
  raw.decks.p1.finish='chrome';
  const cleaned=cards.clean(raw);
  assert.deepEqual(cleaned.finishes['animal:shark'],['porcelain']);
  assert.equal(cleaned.finishes['animal:tiger'],undefined);
  assert.equal(cleaned.decks.p1.finish,undefined,'P1 Bear does not own Chrome');
  // an old save with no finishes at all still loads
  const old=cards.clean({schema:1,inventory:{'animal:bear':1},decks:{},wins:3});
  assert.deepEqual(old.finishes['animal:bear'],[]);assert.equal(old.wins,3);
});
