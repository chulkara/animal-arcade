import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,statSync} from 'node:fs';
const require=createRequire(import.meta.url);
const shark=require('../src/shark-action-core.js');
const cine=require('../src/combat-cinematics-core.js');
const engine=require('../src/combat-engine.js');
const roster=require('../src/roster-core.js');
const cards=require('../src/cards-core.js');
globalThis.window=globalThis.window||{};
const core=require('../src/arena3d-core.js');

const CODES={G:'Guts',T:'Technique',P:'Power',S:'Special'};

test('shark moves are named as approved and keyed G/T/P/S',()=>{
  assert.deepEqual(roster.ANIMALS.shark.moves,{G:'RAMMING BITE',T:'TAIL LASH',P:'BREACH STRIKE',S:'DEEP-SEA FRENZY'});
  for(const m of ['G','T','P','S'])assert.equal(cine.spec('shark',m).name,roster.ANIMALS.shark.moves[m]);
});

test('director, 3D core and the shark core agree on every length and contact frame',()=>{
  for(const [m,code] of Object.entries(CODES)){
    const move=shark.MOVES[code];
    assert.equal(shark.LENGTH[m],move.frames.at(-1).ms);
    assert.equal(cine.AUTHORED_LENGTH.shark[m],shark.LENGTH[m],m+' length');
    assert.equal(cine.SHARK_CONTACT[m],shark.CONTACT[m],m+' contact');
    assert.equal(core.contactMs('shark',m),shark.CONTACT[m]);
    assert.equal(core.actionDuration('shark',m),shark.LENGTH[m]);
    assert.ok(move.contact>200&&move.contact<move.frames.at(-1).ms-300,'contact leaves wind-up and recovery');
    // the contact frame is a key, so the strike pose is exact on the beat
    assert.ok(move.frames.some(f=>f.ms===move.contact),code+' has a key on contact');
  }
});

test('shark poses are smooth, bounded and settle back to rest',()=>{
  for(const code of Object.values(CODES)){
    const {frames}=shark.MOVES[code];const end=frames.at(-1).ms;
    let prev=shark.sampleMove(code,0).pose;
    for(const k of shark.FIELDS)assert.equal(prev[k],0,code+' starts at rest: '+k);
    for(let t=10;t<=end;t+=10){
      const pose=shark.sampleMove(code,t).pose;
      for(const k of shark.FIELDS){
        assert.ok(Number.isFinite(pose[k]));
        // no frame-to-frame pops (yaw/roll spins and the tail whip are fast
        // but continuous: under ~half a 60 fps frame's worth of turn per 10 ms)
        const limit=k==='clipTime'?.06:k==='yaw'||k==='roll'||k==='bend'||k==='tail'?.3:.12;
        assert.ok(Math.abs(pose[k]-prev[k])<=limit,`${code} ${k} jumps at ${t}ms`);
      }
      assert.ok(pose.lift>=-.6&&pose.lift<=1.6,'never through the floor or out of frame');
      prev=pose;
    }
    const last=shark.sampleMove(code,end).pose;
    for(const k of ['travel','lift','pitch','bend','tail','jaw','headYaw'])assert.equal(last[k],0,code+' ends at rest: '+k);
    // full turns end facing the victim again
    assert.ok(Math.abs(Math.sin(last.yaw))<1e-9&&Math.abs(Math.cos(last.yaw)-1)<1e-9);
    assert.ok(Math.abs(Math.sin(last.roll))<1e-9&&Math.abs(Math.cos(last.roll)-1)<1e-9);
    // clip scrub only moves forward (jaws never un-snap), except the Frenzy,
    // whose jaws deliberately re-gape between its two snaps
    if(code!=='Special'){let c=0;for(let t=0;t<=end;t+=5){const v=shark.sampleMove(code,t).pose.clipTime;assert.ok(v>=c-1e-9,code+' clip runs back at '+t);c=v;}}
  }
});

test('the bite clips snap shut on the contact beat',()=>{
  // Bite1 jaws are widest ~0.35-0.43 s and close by ~0.6 s; Bite2 slams at ~0.83 s
  assert.ok(Math.abs(shark.sampleMove('Guts',shark.CONTACT.G).pose.clipTime-.62)<1e-9);
  assert.ok(Math.abs(shark.sampleMove('Power',shark.CONTACT.P).pose.clipTime-.84)<1e-9);
  assert.ok(Math.abs(shark.sampleMove('Special',shark.CONTACT.S).pose.clipTime-.62)<1e-9);
  // Breach: high and nose-up before the blow, crashing down nose-first on it
  const top=shark.sampleMove('Power',1050).pose,hit=shark.sampleMove('Power',shark.CONTACT.P).pose;
  assert.ok(top.lift>1.2&&top.pitch>.4);assert.ok(hit.pitch<-.4&&hit.lift<top.lift);
  // Tail lash: the tail leads (body turned past 90°) when it lands
  assert.ok(shark.sampleMove('Technique',shark.CONTACT.T).pose.yaw>Math.PI/2);
});

test('reduced motion: shark stays at rest and at its plain hover height',()=>{
  const r=shark.sampleMove('Power',1000,{reducedMotion:true});
  for(const k of shark.FIELDS)assert.equal(r.pose[k],0);
  assert.equal(shark.hover(1234,{reducedMotion:true}),shark.HOVER);
  for(let t=0;t<6000;t+=97){const h=shark.hover(t);assert.ok(h>=shark.HOVER-shark.BOB-1e-9&&h<=shark.HOVER+shark.BOB+1e-9);}
  assert.ok(Math.abs(shark.HOVER-.9)<1e-9,'swims ~0.9 m above the floor');
});

test('procedural knockout rolls onto its flank on the floor and reverses cleanly',()=>{
  assert.deepEqual(shark.knockout(0),{roll:0,sink:0,bend:0});
  // on its flank (~90-110°), not belly-up (its dorsal fin propped it up)
  const end=shark.knockout(1);assert.ok(end.roll>1.5&&end.roll<1.95&&end.sink===1&&Math.abs(end.bend)<1e-9);
  let r=0;for(let p=0;p<=1;p+=.02){const k=shark.knockout(p);assert.ok(k.roll>=r-1e-9);r=k.roll;}
});

test('shark is a starter card, fights anyone, and the engine accepts it',()=>{
  assert.ok(cards.STARTER_IDS.includes('animal:shark'));
  assert.equal(cards.BY_ID['animal:shark'].animalId,'shark');
  assert.equal(roster.opponentOf('shark'),'bear');
  for(const picks of [['shark','bear'],['moose','shark'],['shark','shark']]){
    const b=engine.createBattle({picks,rng:()=>.5});
    assert.deepEqual(b.getState().animals.map(a=>a.id),picks);
  }
  assert.throws(()=>engine.createBattle({picks:['shark','tiger']}));
});

test('shark films use the authored timeline (no native attack clips)',()=>{
  for(const move of ['G','T','P','S']){
    for(const finished of [false,true]){
      const event={key:'s'+move,attacker:0,defender:1,attackerId:'shark',defenderId:'bear',move,technique:move==='S'?'P':move,
        special:move==='S',damage:40,knockout:finished,finished,remainingHp:finished?0:100,hits:[40]};
      const t=cine.duration(event);
      assert.ok(t.solo,'shark '+move+' plays as a film');
      assert.ok(t.contact>0&&t.landAt>t.contact&&t.total>t.landAt);
      if(finished)assert.ok(t.victoryStart>t.landAt);
    }
  }
  // shark as the victim is a film too (any attacker into it)
  const t=cine.duration({key:'b',attacker:1,defender:0,attackerId:'bear',defenderId:'shark',move:'P',technique:'P',damage:30,remainingHp:50,hits:[30]},2000);
  assert.ok(t.solo);
});

test('bundled shark model: CC-BY credited, present and the right size',()=>{
  const url=core.BUNDLED.shark.url.replace('./','');
  assert.ok(statSync(url).size>1e6);
  const credits=readFileSync('THIRD_PARTY_ASSETS.md','utf8');
  assert.match(credits,/Mateus Schwaab/);assert.match(credits,/creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(readFileSync('src/app.js','utf8'),/Mateus Schwaab[^<]*CC BY 4\.0/);
  // GLB header: magic 'glTF' v2
  const head=readFileSync(url).subarray(0,8);
  assert.equal(head.toString('ascii',0,4),'glTF');assert.equal(head.readUInt32LE(4),2);
  for(const clip of Object.values(core.BUNDLED.shark.clips))assert.match(clip,/^rig\|(Swim|SwimFast|Bite1|Bite2|Hit|Hit01)$/);
});

test('launch roll stays about the body length while it yaws (no sitting/headstand landings)',()=>{
  const src=readFileSync('src/arena3d-runtime.js','utf8');
  // yaw must be the OUTER rotation, or the yaw spin carries the roll axis across the body
  assert.match(src,/defender\.pivot\.rotation\.set\(th,yw,0,'YXZ'\)/);
  // a swimmer spins about its own length in the swim group, never end over end on the pivot
  assert.match(src,/defender\.swim\.rotation\.z\+=th/);
  // multi-hit pops: each one is gone before the next pops
  assert.match(readFileSync('src/combat-cinematics.js','utf8'),/Math\.min\(550,at\[i\+1\]-at\[i\]\)/);
});
