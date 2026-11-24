/* Noah's Arkade combat rules v2 — Charge / Shield / Attack + Slots.
 * Pure turn-resolution state machine: no DOM, 3D, audio or timers.
 * Inputs are never mutated; every call returns new frozen states plus an
 * ordered event queue for the UI / 3D / audio layers to play back.
 * Randomness only comes from the injected rng() so tests are deterministic.
 * Rules and the decisions made where the brief was silent: see CLAUDE.md. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ArkadeTurnResolver=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const RULES=Object.freeze({
    maxHp:180,
    maxPoints:5,
    tiers:Object.freeze({
      1:Object.freeze({cost:1,damage:20,name:'LIGHT'}),
      2:Object.freeze({cost:2,damage:45,name:'MEDIUM'}),
      3:Object.freeze({cost:3,damage:80,name:'HEAVY'})
    }),
    shieldChip:40,            // Tier 3 vs Shield: 50% of 80
    shatterLockTurns:1,       // Shield disabled on the defender's next turn
    maxConsecutiveShields:2,  // Shield Fatigue
    desperationRatio:.4,      // HP <= 40% of max enables Miracle on any tier
    miracleOdds:1/3,
    miracleDamage:100,
    clashOdds:.5
  });
  const MOVES=Object.freeze({CHARGE:'CHARGE',SHIELD:'SHIELD',ATTACK:'ATTACK'});
  const EVENTS=Object.freeze({
    SLOT_MIRACLE:'SLOT_MIRACLE',
    SLOT_CLASH:'SLOT_CLASH',
    ANIM_CHARGE:'ANIM_CHARGE',
    ANIM_SHIELD_UP:'ANIM_SHIELD_UP',       // a Shield raised with nothing incoming
    ANIM_SHIELD_BLOCK:'ANIM_SHIELD_BLOCK',
    ANIM_SHIELD_SHATTER:'ANIM_SHIELD_SHATTER',
    ANIM_ATTACK_HIT:'ANIM_ATTACK_HIT',
    ANIM_MIRACLE_HIT:'ANIM_MIRACLE_HIT'
  });

  function fail(message){throw new RangeError(message);}
  function createPlayer(options={}){
    const maxHp=options.maxHp??RULES.maxHp;
    if(!Number.isInteger(maxHp)||maxHp<1)fail('maxHp must be a positive integer');
    const hp=options.hp??maxHp;
    const points=options.points??0;
    if(!Number.isInteger(hp)||hp<0||hp>maxHp)fail('hp must be an integer within 0..maxHp');
    if(!Number.isInteger(points)||points<0||points>RULES.maxPoints)fail('points out of range');
    return Object.freeze({
      hp,maxHp,points,
      consecutiveShields:options.consecutiveShields??0,
      shieldLockTurns:options.shieldLockTurns??0
    });
  }
  function isDesperate(player){return player.hp<=player.maxHp*RULES.desperationRatio;}
  function canShield(player){
    return player.shieldLockTurns===0&&player.consecutiveShields<RULES.maxConsecutiveShields;
  }
  function canMiracle(player,tier){
    return Boolean(RULES.tiers[tier])&&player.points>=RULES.tiers[tier].cost&&
      (tier===3||isDesperate(player));
  }
  // What the UI should enable this turn. Charge is always legal.
  function legalMoves(player){
    const tiers=[1,2,3].filter(t=>player.points>=RULES.tiers[t].cost);
    return Object.freeze({
      charge:true,
      shield:canShield(player),
      shieldReason:player.shieldLockTurns>0?'SHATTERED':
        player.consecutiveShields>=RULES.maxConsecutiveShields?'FATIGUE':null,
      attackTiers:Object.freeze(tiers),
      miracleTiers:Object.freeze(tiers.filter(t=>canMiracle(player,t)))
    });
  }
  function normaliseMove(move){
    const type=typeof move==='string'?move:move?.type;
    if(type===MOVES.CHARGE||type===MOVES.SHIELD)return Object.freeze({type,tier:0,miracle:false});
    if(type===MOVES.ATTACK){
      const tier=Number(move.tier);
      if(!RULES.tiers[tier])fail('Attack tier must be 1, 2 or 3');
      return Object.freeze({type,tier,miracle:Boolean(move.miracle)});
    }
    fail('Unknown move '+String(type));
  }
  function validate(player,move,label){
    if(move.type===MOVES.SHIELD&&!canShield(player))
      fail(label+' cannot Shield this turn ('+legalMoves(player).shieldReason+')');
    if(move.type===MOVES.ATTACK){
      if(player.points<RULES.tiers[move.tier].cost)fail(label+' lacks Points for Tier '+move.tier);
      if(move.miracle&&!canMiracle(player,move.tier))fail(label+' is not eligible for a Miracle');
    }
  }
  function roll(rng){
    const value=Number(rng());
    if(!Number.isFinite(value)||value<0||value>=1)fail('rng() must return a number in [0,1)');
    return value;
  }

  function resolveTurn(p1,p2,move1,move2,options={}){
    const rng=options.rng||Math.random;
    const players=[p1,p2];
    const moves=[normaliseMove(move1),normaliseMove(move2)];
    players.forEach((p,i)=>{if(!p||p.hp<=0)fail('Player '+(i+1)+' is already knocked out');});
    moves.forEach((m,i)=>validate(players[i],m,'Player '+(i+1)));

    const events=[];
    const next=players.map(p=>({...p}));
    // Locks from a previous Shatter expire after one turn of being unable to Shield.
    next.forEach(p=>{p.shieldLockTurns=Math.max(0,p.shieldLockTurns-1);});
    // Attack costs are paid up front, win or lose.
    moves.forEach((m,i)=>{if(m.type===MOVES.ATTACK)next[i].points-=RULES.tiers[m.tier].cost;});

    // 1) Miracle wheels, player 1 first.
    const miracleHit=[false,false];
    moves.forEach((m,i)=>{
      if(m.type!==MOVES.ATTACK||!m.miracle)return;
      const value=roll(rng);
      miracleHit[i]=value<RULES.miracleOdds;
      events.push(Object.freeze({type:EVENTS.SLOT_MIRACLE,player:i,tier:m.tier,success:miracleHit[i],roll:value}));
    });
    // Rank: normal tiers 1..3, a successful Miracle outranks everything.
    const rank=i=>moves[i].type!==MOVES.ATTACK?0:miracleHit[i]?4:moves[i].tier;

    // 2) Decide which single attack (if any) lands.
    let lands=null; // index of the attacker whose blow connects
    const attacking=[0,1].filter(i=>moves[i].type===MOVES.ATTACK);
    if(attacking.length===2){
      if(rank(0)===rank(1)){
        const value=roll(rng);
        lands=value<RULES.clashOdds?0:1;
        events.push(Object.freeze({type:EVENTS.SLOT_CLASH,tier:moves[0].tier,
          miracle:rank(0)===4,winner:lands,loser:1-lands,roll:value}));
      }else lands=rank(0)>rank(1)?0:1;
    }else if(attacking.length===1)lands=attacking[0];

    // 3) Charges. A Charge interrupted by a landing attack gains nothing.
    let shattered=null,blocked=null;
    moves.forEach((m,i)=>{
      if(m.type!==MOVES.CHARGE)return;
      const hit=lands===1-i;
      const gained=hit?0:Math.min(1,RULES.maxPoints-next[i].points);
      next[i].points+=gained;
      events.push(Object.freeze({type:EVENTS.ANIM_CHARGE,player:i,gained,interrupted:hit}));
    });

    // 4) Shields and the landing blow.
    let damage=0,miracleLanded=false;
    if(lands!==null){
      const target=1-lands,attack=moves[lands];
      if(miracleHit[lands]){
        damage=RULES.miracleDamage;miracleLanded=true;
      }else if(moves[target].type===MOVES.SHIELD){
        if(attack.tier===3){
          damage=RULES.shieldChip;shattered=target;
        }else blocked=target;
      }else damage=RULES.tiers[attack.tier].damage;
    }
    moves.forEach((m,i)=>{
      if(m.type!==MOVES.SHIELD)return;
      if(blocked===i)events.push(Object.freeze({type:EVENTS.ANIM_SHIELD_BLOCK,player:i,attacker:1-i,tier:moves[1-i].tier}));
      else if(shattered===i)events.push(Object.freeze({type:EVENTS.ANIM_SHIELD_SHATTER,player:i,attacker:1-i,chip:RULES.shieldChip}));
      else if(lands!==1-i)events.push(Object.freeze({type:EVENTS.ANIM_SHIELD_UP,player:i}));
    });
    if(shattered!==null)next[shattered].shieldLockTurns=RULES.shatterLockTurns;
    if(lands!==null&&damage>0){
      const target=1-lands;
      next[target].hp=Math.max(0,next[target].hp-damage);
      events.push(Object.freeze({
        type:miracleLanded?EVENTS.ANIM_MIRACLE_HIT:EVENTS.ANIM_ATTACK_HIT,
        player:lands,target,tier:moves[lands].tier,damage,
        chip:shattered===target,remainingHp:next[target].hp,knockout:next[target].hp===0
      }));
    }

    // 5) Shield Fatigue bookkeeping.
    moves.forEach((m,i)=>{
      next[i].consecutiveShields=m.type===MOVES.SHIELD?next[i].consecutiveShields+1:0;
    });

    const winner=next[0].hp===0?1:next[1].hp===0?0:null;
    return Object.freeze({
      p1:Object.freeze(next[0]),p2:Object.freeze(next[1]),
      events:Object.freeze(events),winner
    });
  }

  return Object.freeze({RULES,MOVES,EVENTS,createPlayer,legalMoves,isDesperate,
    canShield,canMiracle,resolveTurn});
});
