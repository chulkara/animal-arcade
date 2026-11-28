import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const combat=require('../src/combat-engine.js');
const cards=require('../src/cards-core.js');
const session=require('../src/match-session.js');

const C=cards.BY_ID;
const mods=(animal,strong,miracle)=>cards.modifiersFor(C['animal:'+animal],strong?C[strong]:null,miracle?C[miracle]:null);
// DUEL: P1 attack, P2 attack, P1 power, P2 power
function exchange(modifiers,[t0,t1],[p0,p1],picks=['bear','moose'],opts={}){
  const b=combat.createBattle({mode:'DUEL',picks,modifiers,...opts});
  b.stop(t0);b.stop(t1);b.stop(p0);b.stop(p1);
  return b;
}

test('every card has rules text, and every effect is one the engine understands',()=>{
  for(const card of cards.CARDS){
    if(card.type==='animal'){
      const {G,T,P}=card.stats;assert.equal(G+T+P,12,card.name+' levels total 12');
      for(const v of [G,T,P])assert.ok(v>=1&&v<=5);
      continue;
    }
    assert.ok(card.rules.length>=1,card.name+' has rules text');
    for(const e of card.effects){
      assert.ok(combat.EFFECT_KINDS.includes(e.kind),card.name+' '+e.kind);
      assert.equal(e.source,card.name);
      assert.equal(combat.cleanEffects([e]).length,1,card.name+' effect survives validation');
    }
    if(card.type==='miracle')assert.ok(card.fits.length>=1&&card.fits.every(id=>C['animal:'+id]));
  }
  // every animal has a fitting Miracle in the starter set
  for(const id of ['bear','moose','shark'])
    assert.ok(cards.STARTER_IDS.some(c=>C[c].type==='miracle'&&C[c].fits.includes(id)&&C[c].fits.length===1),id);
});

test('Animal cards: G/T/P levels change damage per technique',()=>{
  const plain=exchange([{},{}],['G','G'],[50,10]).getState().lastEvent.damage;
  const shark=mods('shark');
  const t=exchange([shark,{}],['T','G'],[50,10],['shark','bear']).getState().lastEvent;
  const tPlain=exchange([{},{}],['T','G'],[50,10],['shark','bear']).getState().lastEvent;
  assert.equal(t.damage-tPlain.damage,(5-3)*combat.STAT_STEP,'shark Technique 5');
  const g=exchange([shark,{}],['G','G'],[50,10],['shark','bear']).getState().lastEvent;
  assert.equal(g.damage,plain,'shark Guts 3 is the baseline');
});

test('Oaken Guard: Guts hits taken -8; other hits untouched',()=>{
  const def=mods('moose','strong:guard');
  const g=exchange([{},def],['G','T'],[50,10]).getState().lastEvent;
  const gPlain=exchange([{},{}],['G','T'],[50,10]).getState().lastEvent;
  assert.equal(gPlain.damage-g.damage,8);
  assert.deepEqual(g.cardGuard,{name:'OAKEN GUARD',amount:8});
  const p=exchange([{},def],['P','T'],[50,10]).getState().lastEvent;
  assert.equal(p.cardGuard,null);
});

test('Wind Dancer: a power tie goes to the Technique attacker; otherwise it rerolls',()=>{
  const wind=mods('shark','strong:wind');
  const won=exchange([wind,{}],['T','P'],[30,30],['shark','bear']).getState();
  assert.equal(won.lastEvent.kind,'HIT');assert.equal(won.lastEvent.attacker,0);
  assert.equal(won.lastEvent.tieBreak,'WIND DANCER');
  // it works for the second player too
  const won2=exchange([{},wind],['G','T'],[40,40],['bear','shark']).getState();
  assert.equal(won2.lastEvent.attacker,1);
  // chose Guts: no help, normal reroll
  const tie=exchange([wind,{}],['G','P'],[30,30],['shark','bear']).getState();
  assert.equal(tie.lastEvent.kind,'TIE');assert.equal(tie.phase,'POWER');
  // both sides hold it: the usual reroll
  const both=exchange([wind,mods('shark','strong:wind')],['T','T'],[20,20],['shark','shark']).getState();
  assert.equal(both.lastEvent.kind,'TIE');
});

test('reel cards add faces to that player only; the CPU draws from its own strip',()=>{
  const b=combat.createBattle({mode:'DUEL',picks:['bear','moose'],modifiers:[mods('bear','strong:ember','miracle:meteor'),{}]});
  assert.deepEqual(b.reel(0,'ATTACK').filter(v=>v==='P').length,2);
  assert.equal(b.reel(0,'POWER').filter(v=>v==='MARK').length,2);
  assert.deepEqual(b.reel(1,'ATTACK'),['G','T','P']);
  assert.deepEqual(b.reel(1,'POWER'),[10,20,30,40,50,'MARK']);
  // the extra face is not next to its twin at the end of the strip
  const strip=b.reel(0,'POWER');assert.notEqual(strip.indexOf('MARK'),strip.length-2);
  // a Falling Star on the Moose (does not fit) adds no face
  const off=combat.createBattle({mode:'DUEL',picks:['moose','bear'],modifiers:[mods('moose',null,'miracle:meteor'),{}]});
  assert.equal(off.reel(0,'POWER').filter(v=>v==='MARK').length,1);
  // SOLO CPU stops on its own strip: with rng→last face it lands on the added ✦
  const solo=combat.createBattle({mode:'SOLO',picks:['moose','bear'],rng:()=>.9999,modifiers:[{},mods('bear',null,'miracle:meteor')]});
  solo.stop('G');solo.stop(10);
  assert.equal(solo.getState().lastEvent.attacker,1);assert.equal(solo.getState().lastEvent.power,'MARK');
  // the session passes the strip through
  const m=session.createMatch({mode:'DUEL',picks:['bear','moose'],modifiers:[mods('bear','strong:ember'),{}]});
  assert.equal(m.reel(0,'ATTACK').length,4);
});

test('Iron Heart: Resurrection returns on 40%',()=>{
  const iron=mods('bear','strong:iron');
  const b=combat.createBattle({mode:'DUEL',picks:['moose','bear'],modifiers:[{},iron],initialHp:[180,5]});
  b.stop('P');b.stop('G');b.stop(50);b.stop(10);
  const e=b.getState().lastEvent;
  assert.equal(e.resurrected,true);assert.equal(e.remainingHp,Math.round(180*.4));assert.equal(e.reviveCard,'IRON HEART');
});

test('Dawn Chorus: heals 8 at each new round while at half health or less (Moose only)',()=>{
  const dawn=mods('moose',null,'miracle:dawn');
  const b=combat.createBattle({mode:'DUEL',picks:['bear','moose'],modifiers:[{},dawn],initialHp:[180,100]});
  b.stop('G');b.stop('T');b.stop(50);b.stop(10);
  const hit=b.getState().animals[1].hp;assert.ok(hit<=90);
  b.nextRound();
  const s=b.getState();
  assert.equal(s.animals[1].hp,hit+8);assert.deepEqual(s.regen[1],{name:'DAWN CHORUS',heal:8});
  assert.equal(s.regen[0],null);
  // above half: nothing
  const high=combat.createBattle({mode:'DUEL',picks:['bear','moose'],modifiers:[{},dawn]});
  high.stop('G');high.stop('T');high.stop(10);high.stop(50);high.nextRound();
  assert.equal(high.getState().regen[1],null);
  // on the Bear it does not fit: ✦ damage only, no mending
  const bearDawn=mods('bear',null,'miracle:dawn');
  assert.equal(bearDawn.fits,false);assert.equal(bearDawn.effects.some(e=>e.kind==='regen'),false);
  assert.equal(bearDawn.miracleBonus,9);assert.equal(dawn.miracleBonus,13);
});

test('Storm Bell: ✦ hits break through Focus Guard',()=>{
  const storm=mods('bear',null,'miracle:storm');
  const run=m=>{const b=combat.createBattle({mode:'DUEL',picks:['bear','moose'],modifiers:[m,{}],initialHp:[180,80]});
    b.stop('P');b.stop('G');b.stop('MARK');b.stop(10);return b.getState().lastEvent;};
  const guarded=run(mods('bear')),pierced=run(storm);
  assert.equal(guarded.focusGuard,true);
  assert.equal(pierced.focusGuard,false);assert.equal(pierced.pierced,'STORM BELL');
  assert.equal(pierced.damage,pierced.rawDamage);
});

test('Tidal Wish: Technique hits taken cut by 40% (Shark)',()=>{
  const tidal=mods('shark',null,'miracle:tidal');
  const plain=exchange([{},{}],['T','G'],[50,10],['bear','shark']).getState().lastEvent;
  const cut=exchange([{},tidal],['T','G'],[50,10],['bear','shark']).getState().lastEvent;
  assert.equal(cut.cardGuard.name,'TIDAL WISH');
  assert.equal(cut.damage,plain.damage-Math.round(plain.damage*.4));
});

test('Eclipse Oath: at a third of health or less the power reel is 40/50/✦',()=>{
  const ecl=mods('moose',null,'miracle:eclipse');
  const low=combat.createBattle({mode:'DUEL',picks:['moose','bear'],modifiers:[ecl,{}],initialHp:[60,180]});
  assert.deepEqual(low.reel(0,'POWER'),[40,50,'MARK']);
  const ok=combat.createBattle({mode:'DUEL',picks:['moose','bear'],modifiers:[ecl,{}],initialHp:[61,180]});
  assert.equal(ok.reel(0,'POWER').length,6);
});

test('CPU decks fit their animals and the engine accepts every loadout',()=>{
  for(const [animal,deck] of Object.entries(cards.CPU_DECKS)){
    const m=cards.cpuModifiers(animal);
    assert.equal(m.fits,true,animal+' CPU Miracle fits');
    assert.equal(m.strongName,C[deck.strong].name);
    const b=combat.createBattle({mode:'SOLO',picks:['bear',animal],modifiers:[mods('bear','strong:fang','miracle:meteor'),m],rng:()=>.3});
    b.stop('P');b.stop(50);assert.ok(b.getState().lastEvent);
  }
});

test('hostile effect data is clamped or dropped',()=>{
  const out=combat.cleanEffects([{kind:'stat',G:99,T:-5,P:'x'},{kind:'guard',against:'G',flat:999,cut:5},
    {kind:'reel',phase:'POWER',add:['MARK','MARK','MARK',99]},{kind:'revive',share:9},{kind:'nope'},
    {kind:'desperate',below:.3,strip:['MARK']},{kind:'guard',against:'X',flat:5},{kind:'regen',hp:999,below:9,source:'<b>'}]);
  assert.deepEqual(out.map(e=>e.kind),['stat','guard','reel','revive','regen']);
  assert.deepEqual([out[0].G,out[0].T,out[0].P],[5,1,3]);
  assert.equal(out[1].flat,20);assert.equal(out[1].cut,.6);
  assert.equal(out[2].add.length,2);assert.equal(out[3].share,.5);
  assert.equal(out[4].hp,15);assert.equal(out[4].source,null);
  // a guard never takes a hit below 1
  const b=combat.createBattle({mode:'DUEL',picks:['bear','moose'],modifiers:[{},{effects:[{kind:'guard',against:'G',cut:.6,flat:20}]}]});
  b.stop('G');b.stop('T');b.stop(20);b.stop(10);
  const e=b.getState().lastEvent;assert.ok(e.damage>=1&&e.cardGuard.amount===e.rawDamage-e.damage);
});
