/* Noah's Arkade Phase 3: original, two-reel combat prototype.
 * Inspired by verified arcade interaction (technique -> power -> higher wins).
 * Damage values and creature balancing are ORIGINAL PROTOTYPE VALUES, not
 * claims about Animal Kaiser internals. No proprietary animations/assets. */
(function(root,factory){
  const roster=typeof module==='object'&&module.exports?
    require('./roster-core.js'):root?.NoahsRoster;
  const api=factory(roster);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ArkadeCombatEngine=api;
})(typeof window!=='undefined'?window:null,function(roster){
  'use strict';
  // Any roster animal may fight (rules are animal-agnostic).
  const ROSTER_IDS=Object.freeze([...(roster?.ids||['bear','moose','shark'])]);
  const TECHNIQUES=Object.freeze(['G','T','P']);
  const POWERS=Object.freeze([10,20,30,40,50,'MARK']);
  const BASE_HP=180;
  const ATTACK_NAMES=Object.freeze({G:'GUTS',T:'TECHNIQUE',P:'POWER'});
  const BONUS=Object.freeze({G:14,T:8,P:18});
  // Comeback layers (original rules, decided 2026-11-25 on top of G/T/P):
  // Focus Guard - the first HEAVY hit (Power, ✦, or >= 60) an animal takes at
  //   or below half health is cut by 35%. Once per bout per animal.
  // Resurrection - once per bout per animal, a hit that would KO leaves it
  //   on 25% health instead.
  // Hits - how a strike's damage is shown: Guts one blow, Technique two,
  //   Power/✦ three (shares sum exactly to the damage; rules unchanged).
  const FOCUS_CUT=.35,HEAVY_DAMAGE=60,REVIVE_SHARE=.25;
  const HIT_SHARES=Object.freeze({G:[1],T:[.45,.55],P:[.25,.25,.5],MARK:[.25,.25,.5]});
  function splitHits(damage,key){
    const shares=HIT_SHARES[key]||[1];let left=damage;
    return shares.map((share,i)=>{const v=i===shares.length-1?left:Math.round(damage*share);left-=v;return v;});
  }
  function assert(value,message){if(!value)throw new Error(message);}
  function selectFrom(source,rng){
    const n=Math.min(0.999999,Math.max(0,Number(rng())||0));
    return source[Math.floor(n*source.length)];
  }
  // Card effects (data-driven; cards-core.js defines which card has which).
  // Each is a hook the rules consult; every number is clamped here so a
  // hand-edited save can never break a fight.
  //   stat      Animal card G/T/P levels 1-5: (level-3)*STAT_STEP damage
  //   guard     defender: hits of one kind (G/T/P or ✦) cut by flat or share
  //   tieWin    a power TIE goes to you (no reroll) when you attacked with it
  //   reel      extra faces on your own reel (easier to stop on them)
  //   revive    your Resurrection leaves you on this share instead of 25%
  //   regen     at each new round, heal while at or below a share of max HP
  //   pierce    your ✦ hits ignore Focus Guard
  //   desperate at or below a share of max HP your power reel becomes a strip
  const STAT_STEP=3;
  const EFFECT_KINDS=Object.freeze(['stat','guard','tieWin','reel','revive','regen','pierce','desperate']);
  function cleanEffects(list){
    if(!Array.isArray(list))return [];
    const num=(v,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):null;
    const name=v=>typeof v==='string'&&/^[A-Z0-9 ]{1,40}$/.test(v)?v:null;
    const out=[];
    for(const e of list.slice(0,8)){
      if(!e||typeof e!=='object'||!EFFECT_KINDS.includes(e.kind))continue;
      const source=name(e.source);
      if(e.kind==='stat'){
        const lv={};for(const t of TECHNIQUES){const v=num(e[t],1,5);lv[t]=v==null?3:Math.round(v);}
        out.push({kind:'stat',...lv,source});
      }else if(e.kind==='guard'){
        const against=[...TECHNIQUES,'MARK'].includes(e.against)?e.against:null;
        const flat=Math.round(num(e.flat,0,20)??0),cut=num(e.cut,0,.6)??0;
        if(against&&(flat||cut))out.push({kind:'guard',against,flat,cut,source});
      }else if(e.kind==='tieWin'){
        if(TECHNIQUES.includes(e.technique))out.push({kind:'tieWin',technique:e.technique,source});
      }else if(e.kind==='reel'){
        const phase=e.phase==='ATTACK'||e.phase==='POWER'?e.phase:null;
        const pool=phase==='ATTACK'?TECHNIQUES:POWERS;
        const add=phase&&Array.isArray(e.add)?e.add.filter(v=>pool.includes(v)).slice(0,2):[];
        if(add.length)out.push({kind:'reel',phase,add,source});
      }else if(e.kind==='revive'){
        const share=num(e.share,.1,.5);if(share!=null)out.push({kind:'revive',share,source});
      }else if(e.kind==='regen'){
        const hp=num(e.hp,1,15),below=num(e.below,.1,1);
        if(hp!=null&&below!=null)out.push({kind:'regen',hp:Math.round(hp),below,source});
      }else if(e.kind==='pierce'){
        out.push({kind:'pierce',source});
      }else if(e.kind==='desperate'){
        const below=num(e.below,.1,.5),strip=Array.isArray(e.strip)?e.strip.filter(v=>POWERS.includes(v)).slice(0,6):[];
        if(below!=null&&strip.length>=2)out.push({kind:'desperate',below,strip,source});
      }
    }
    return out;
  }
  function cleanModifier(m){
    const tech=TECHNIQUES.includes(m?.strongTechnique)?m.strongTechnique:null;
    const bounded=(value,max)=>Number.isSafeInteger(value)?Math.max(0,Math.min(max,value)):0;
    const label=value=>typeof value==='string'&&/^[A-Z0-9 ]{1,40}$/.test(value)?value:null;
    return {
      strongTechnique:tech,
      strongBonus:tech?bounded(m?.strongBonus,25):0,
      miracleBonus:bounded(m?.miracleBonus,40),
      strongName:tech?label(m?.strongName):null,
      miracleName:label(m?.miracleName),
      effects:cleanEffects(m?.effects)
    };
  }
  function createBattle({mode='SOLO',picks=['bear','moose'],rng=Math.random,modifiers=[],initialHp=[BASE_HP,BASE_HP]}={}){
    assert(mode==='SOLO'||mode==='DUEL','Unsupported battle mode');
    assert(Array.isArray(picks)&&picks.length===2&&picks.every(id=>ROSTER_IDS.includes(id)),'Choose two valid animals');
    assert(typeof rng==='function','RNG must be a function');
    assert(Array.isArray(initialHp)&&initialHp.length===2&&
      initialHp.every(hp=>Number.isInteger(hp)&&hp>=1&&hp<=BASE_HP),'Invalid initial HP');
    const original=[...picks];
    const initialHealth=[...initialHp];
    const initialModifiers=[cleanModifier(modifiers?.[0]),cleanModifier(modifiers?.[1])];
    let state;
    function reset(){
      state={
        mode,animals:original.map((id,i)=>({id,hp:initialHealth[i],maxHp:BASE_HP,player:i+1})),
        round:1,phase:'ATTACK',actor:0,selected:[{technique:null,power:null},{technique:null,power:null}],
        tieCharge:0,lastEvent:null,winner:null,history:[],
        focusUsed:[false,false],revived:[false,false],regen:[null,null],
        modifiers:initialModifiers.map(m=>({...m,effects:m.effects.map(e=>({...e}))}))
      };
      return getState();
    }
    function getState(){return JSON.parse(JSON.stringify(state));}
    const fx=(p,kind)=>state.modifiers[p].effects.filter(e=>e.kind===kind);
    // A player's reel strip right now: the standard faces plus any card's
    // extra faces (spread into the middle), or the desperation strip.
    function reel(player,phase=state.phase){
      const p=player===1?1:0;
      if(phase==='POWER'){
        const a=state.animals[p];
        const d=fx(p,'desperate').find(e=>a.hp>0&&a.hp<=a.maxHp*e.below);
        if(d)return [...d.strip];
      }
      const strip=phase==='ATTACK'?[...TECHNIQUES]:[...POWERS];
      for(const e of fx(p,'reel'))if(e.phase===phase)
        for(const v of e.add)strip.splice(Math.ceil(strip.length/2)+(strip.length%2?0:1),0,v);
      return strip;
    }
    function completeAttack(){
      if(mode==='SOLO'&&state.selected[1].technique===null)
        state.selected[1].technique=selectFrom(reel(1,'ATTACK'),rng);
      if(state.selected.every(entry=>entry.technique!==null)){
        state.phase='POWER';state.actor=0;
      }
    }
    function completePower(){
      if(mode==='SOLO'&&state.selected[1].power===null)
        state.selected[1].power=selectFrom(reel(1,'POWER'),rng);
      if(state.selected.every(entry=>entry.power!==null))resolve();
    }
    function stop(value){
      if(state.phase==='ATTACK'){
        assert(TECHNIQUES.includes(value),'Attack slot accepts G, T, or P');
        const actor=state.actor;
        assert(state.selected[actor].technique===null,'Attack already stopped');
        state.selected[actor].technique=value;
        if(mode==='DUEL'&&actor===0)state.actor=1;
        completeAttack();
      }else if(state.phase==='POWER'){
        assert(POWERS.includes(value),'Power slot accepts 10-50 or MARK');
        const actor=state.actor;
        assert(state.selected[actor].power===null,'Power already stopped');
        state.selected[actor].power=value;
        if(mode==='DUEL'&&actor===0)state.actor=1;
        completePower();
      }else throw new Error('The slot cannot be stopped during results');
      return getState();
    }
    function rank(v){return v==='MARK'?60:v;}
    function resolve(){
      const p0=rank(state.selected[0].power),p1=rank(state.selected[1].power);
      // a tie-winning card settles a tie for the side that attacked with its
      // technique (both or neither: the usual reroll)
      const tw=[0,1].map(p=>fx(p,'tieWin').find(e=>e.technique===state.selected[p].technique)||null);
      const tieTo=p0===p1&&Boolean(tw[0])!==Boolean(tw[1])?(tw[0]?0:1):null;
      if(p0===p1&&tieTo===null){
        state.tieCharge=Math.min(5,state.tieCharge+1);
        state.lastEvent={kind:'TIE',round:state.round,charge:state.tieCharge,
          powers:[state.selected[0].power,state.selected[1].power],
          message:'POWER TIE! REROLL FOR A STRONGER STRIKE.'};
        state.history.push(state.lastEvent);
        state.selected.forEach(entry=>{entry.power=null;});
        state.phase='POWER';state.actor=0;
        return;
      }
      const attacker=tieTo??(p0>p1?0:1),defender=1-attacker;
      const attack=state.selected[attacker];
      const rankValue=rank(attack.power);
      // Purposefully original, lightweight tuning until card and move research is complete.
      // Strong card only boosts its named attack technique. Miracle only triggers
      // when the winning roll is the special ✦ fighting-feature mark.
      const card=state.modifiers[attacker];
      const strongBonus=card.strongTechnique===attack.technique?card.strongBonus:0;
      const miracleBonus=attack.power==='MARK'?card.miracleBonus:0;
      // Animal card: the attacker's level in this technique
      const stat=fx(attacker,'stat')[0];
      const statBonus=stat?(stat[attack.technique]-3)*STAT_STEP:0;
      const raw=Math.round(18+rankValue*0.5+BONUS[attack.technique]+
        state.tieCharge*12+(attack.power==='MARK'?20:0)+strongBonus+miracleBonus+statBonus);
      const victim=state.animals[defender];
      const hpBefore=victim.hp;
      const heavy=attack.technique==='P'||attack.power==='MARK'||raw>=HEAVY_DAMAGE;
      const pierce=attack.power==='MARK'?fx(attacker,'pierce')[0]||null:null;
      const wouldGuard=heavy&&!state.focusUsed[defender]&&victim.hp<=victim.maxHp/2;
      const focusGuard=wouldGuard&&!pierce;
      if(focusGuard)state.focusUsed[defender]=true;
      let damage=focusGuard?Math.round(raw*(1-FOCUS_CUT)):raw;
      // the defender's guard card against this kind of hit
      const g=fx(defender,'guard').find(e=>e.against===attack.technique||(e.against==='MARK'&&attack.power==='MARK'));
      const cut=g?Math.min(damage-1,Math.max(g.flat,Math.round(damage*g.cut))):0;
      damage-=cut;
      const cardGuard=cut>0?{name:g.source,amount:cut}:null;
      const revive=fx(defender,'revive')[0]||null;
      let resurrected=false;
      if(victim.hp-damage<=0&&!state.revived[defender]){
        state.revived[defender]=true;resurrected=true;
        victim.hp=Math.max(1,Math.round(victim.maxHp*(revive?.share??REVIVE_SHARE)));
      }else victim.hp=Math.max(0,victim.hp-damage);
      state.winner=victim.hp===0?attacker:null;
      state.phase=state.winner===null?'RESULT':'FINISHED';
      state.lastEvent={
        kind:'HIT',round:state.round,attacker,defender,technique:attack.technique,
        attackName:ATTACK_NAMES[attack.technique],power:attack.power,
        damage,remainingHp:victim.hp,charge:state.tieCharge,
        special:attack.power==='MARK',winner:state.winner,
        strongBonus,miracleBonus,strongName:strongBonus?card.strongName:null,
        miracleName:miracleBonus?card.miracleName:null,
        rawDamage:raw,hpBefore,focusGuard,guarded:raw-damage,resurrected,
        statBonus,cardGuard,tieBreak:tieTo!==null?tw[tieTo].source||'TIE BREAK':null,
        pierced:wouldGuard&&pierce?pierce.source||'PIERCE':null,
        reviveCard:resurrected&&revive?revive.source:null,
        hits:splitHits(damage,attack.power==='MARK'?'MARK':attack.technique),
        goldChange:attack.power==='MARK',superMiracle:attack.power==='MARK'&&state.winner!==null
      };
      state.history.push(state.lastEvent);
      if(state.history.length>60)state.history.shift();
    }
    function nextRound(){
      assert(state.phase==='RESULT','Next round is only available after a hit');
      state.round++;
      state.phase='ATTACK';state.actor=0;
      state.tieCharge=0;
      state.selected=[{technique:null,power:null},{technique:null,power:null}];
      // healing cards at the start of the new round
      state.regen=[0,1].map(p=>{
        const e=fx(p,'regen')[0],a=state.animals[p];
        if(!e||a.hp<=0||a.hp>a.maxHp*e.below)return null;
        const heal=Math.min(e.hp,a.maxHp-a.hp);if(heal<=0)return null;
        a.hp+=heal;return {name:e.source,heal};
      });
      state.lastEvent=null;
      return getState();
    }
    reset();
    return Object.freeze({stop,nextRound,reset,getState,reel});
  }
  return Object.freeze({createBattle,TECHNIQUES,POWERS,BASE_HP,ATTACK_NAMES,STAT_STEP,EFFECT_KINDS,cleanEffects,
    FOCUS_CUT,HEAVY_DAMAGE,REVIVE_SHARE,HIT_SHARES,splitHits});
});
