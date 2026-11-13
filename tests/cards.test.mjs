import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const cards=require('../src/cards-core.js');
const combat=require('../src/combat-engine.js');
function storage(){
  const map=new Map();
  return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),map};
}

test('catalog has distinct original cards in all three scanned card classes',()=>{
  assert.equal(cards.CARDS.length,12);
  assert.deepEqual([...new Set(cards.CARDS.map(c=>c.type))].sort(),['animal','miracle','strong']);
  assert.equal(new Set(cards.CARDS.map(c=>c.id)).size,cards.CARDS.length);
  assert.equal(cards.CARDS.filter(c=>c.type==='animal').length,2);
  for(const c of cards.CARDS){
    assert.equal(cards.BY_ID[c.id],c);
    assert.match(c.description,/.+/);
  }
});

test('starter collection is playable and independently editable for two players',()=>{
  const db=cards.createStore(storage());
  const s=db.getState();
  assert.equal(Object.values(s.inventory).filter(n=>n>0).length,6);
  assert.equal(s.inventory['animal:tiger'],1);
  assert.equal(s.inventory['animal:lion'],1);
  assert.equal(s.inventory['strong:wind'],0);
  assert.equal(db.getDeck('p1').animal,'animal:tiger');
  assert.equal(db.getDeck('p2').animal,'animal:lion');
  assert.equal(db.equip('p1','strong:wind'),false,'locked cards cannot be equipped');
  assert.equal(db.equip('p1','animal:lion'),true);
  assert.equal(db.getDeck('p1').animal,'animal:lion');
  assert.equal(db.getDeck('p2').animal,'animal:lion','local player two deck is independent');
  assert.equal(db.unequip('p1','animal'),false,'one Animal card required');
  assert.equal(db.unequip('p1','miracle'),true);
  assert.equal(db.getDeck('p1').miracle,null);
});

test('reward unlocks missing cards first and duplicate stacks later',()=>{
  const db=cards.createStore(storage());
  const allLocked=cards.CARDS.filter(c=>db.getState().inventory[c.id]===0);
  for(let i=0;i<allLocked.length;i++){
    const reward=db.grantReward(()=>0);
    assert.equal(reward.id,allLocked[i].id);
    assert.equal(reward.newCard,true);
    assert.equal(reward.count,1);
  }
  const next=db.grantReward(()=>0);
  assert.equal(next.newCard,false);
  assert.equal(next.count,2);
  assert.equal(db.getState().wins,allLocked.length+1);
  assert.equal(db.equip('p1','strong:wind'),true);
  assert.equal(db.getDeck('p1').strong,'strong:wind');
});

test('inventory and decks persist through page reload and valid JSON backup',()=>{
  const disk=storage(),db=cards.createStore(disk);
  db.grantReward(()=>0);db.equip('p2','strong:wind');
  const backup=db.exportSave();
  const restored=cards.createStore(disk);
  assert.equal(restored.getDeck('p2').strong,'strong:wind');
  assert.equal(restored.getState().wins,1);
  const second=cards.createStore(storage());
  assert.equal(second.importSave(backup),true);
  assert.equal(second.getDeck('p2').strong,'strong:wind');
  assert.equal(second.getState().inventory['strong:wind'],1);
});

test('malformed, forged, and future-version saves cannot gain phantom cards or crash',()=>{
  const disk=storage(),db=cards.createStore(disk);
  assert.equal(db.importSave('garbage'),false);
  assert.equal(db.importSave('{"schema":5,"inventory":{},"decks":{}}'),false);
  assert.equal(db.getState().wins,0);
  const forged={schema:1,inventory:{'animal:tiger':-5,'strong:wind':2000,
    'strong:impossible':50},decks:{p1:{animal:'animal:impossible',strong:'strong:wind',
      miracle:'miracle:dawn'},p2:{strong:'strong:impossible'}},wins:-10,lastReward:'wrong'};
  assert.equal(db.importSave(JSON.stringify(forged)),true);
  const s=db.getState();
  assert.equal(s.inventory['animal:tiger'],1,'starter cannot be lost');
  assert.equal(s.inventory['strong:wind'],0,'overflow inventory is discarded');
  assert.equal(s.decks.p1.animal,'animal:tiger');
  assert.equal(s.decks.p1.strong,'strong:fang');
  assert.equal(s.wins,0);
  assert.equal(s.lastReward,null);
});

test('read-only and unavailable browser storage keeps a session inventory',()=>{
  const blocked={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
  const db=cards.createStore(blocked);
  assert.equal(db.getState().persistence,'memory');
  assert.equal(db.grantReward(()=>0).newCard,true);
  assert.equal(db.getState().wins,1);
});

test('Strong card applies to its G/T/P feature, Miracle only to special mark',()=>{
  const store=cards.createStore(storage());
  const m=store.getModifiers('p1','tiger');
  assert.equal(m.strongTechnique,'P');
  assert.equal(m.strongBonus,8);
  assert.equal(m.miracleBonus,14,'matching forest affinity +4 is a PROTOTYPE rule');
  const sameTechnique=(modifier,mark)=>{
    const battle=combat.createBattle({mode:'DUEL',picks:['tiger','lion'],
      modifiers:[modifier,{}]});
    battle.stop('P');battle.stop('G');
    battle.stop(mark? 'MARK':50);battle.stop(10);
    return battle.getState().lastEvent;
  };
  const base=sameTechnique({},false);
  const strong=sameTechnique(m,false);
  assert.equal(strong.damage-base.damage,8);
  assert.equal(strong.miracleBonus,0);
  const specialBase=sameTechnique({},true);
  const special=sameTechnique(m,true);
  assert.equal(special.damage-specialBase.damage,8+14);
  assert.equal(special.strongBonus,8);
  assert.equal(special.miracleBonus,14);
  const gBattle=combat.createBattle({mode:'DUEL',picks:['tiger','lion'],modifiers:[m,{}]});
  gBattle.stop('G');gBattle.stop('P');gBattle.stop(50);gBattle.stop(10);
  assert.equal(gBattle.getState().lastEvent.strongBonus,0);
  store.equip('p1','animal:lion');
  assert.equal(store.getModifiers('p1','tiger').strongBonus,0,
    'stale loadouts cannot buff a different animal');
});

test('combat engine caps arbitrary modifiers to avoid overflow',()=>{
  const battle=combat.createBattle({mode:'DUEL',modifiers:[
    {strongTechnique:'P',strongBonus:999,miracleBonus:900,strongName:'<unsafe>'},{}
  ]});
  battle.stop('P');battle.stop('G');battle.stop('MARK');battle.stop(10);
  const r=battle.getState().lastEvent;
  assert.equal(r.strongBonus,25);
  assert.equal(r.miracleBonus,40);
  assert.equal(r.strongName,null);
});

test('collection scripts and routing are present without changing menu original',()=>{
  const html=readFileSync('index.html','utf8'),app=readFileSync('src/app.js','utf8');
  const ui=readFileSync('src/cards-ui.js','utf8'),p=readFileSync('src/prototype.js','utf8');
  const battle=readFileSync('src/combat-ui.js','utf8');
  assert.ok(html.includes('src/cards-core.js')&&html.includes('src/cards-ui.js'));
  assert.ok(html.includes('src/cards.css'));
  assert.ok(app.includes("MY_CARDS:'CARDS'")&&app.includes("BINDER:'BINDER'"));
  assert.ok(app.includes("window.NoahsCards.render(screen)"));
  assert.ok(p.includes('window.NoahsCards?.equipAnimal('));
  assert.ok(battle.includes('window.NoahsCards?.grantBattleReward()'));
  assert.ok(ui.includes('Cloud Binder is planned'));
  assert.ok(readFileSync('src/painted-menu.js','utf8').includes("const ART='./assets/approved-menu.png'"));
});
