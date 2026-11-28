/* Phase 4 local-first card catalog and inventory: original Noah's Arkade cards.
 * No accounts, purchases, payment, cloud saves, or copyrighted card scans.
 * Strong/Miracle numeric effects are OUR provisional balance, not arcade values. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ArkadeCardsCore=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const KEY='noahs-arkade.cards.v1';
  const TYPES=['animal','strong','miracle'];
  // effects: hooks the combat engine understands (combat-engine.js,
  // cleanEffects). rules: the card's own words for the binder.
  // Miracle `fits`: the animals it is compatible with. A Miracle on an animal
  // it does not fit still adds its ✦ damage, but its special effect sleeps.
  const CARDS=Object.freeze([
    {id:'animal:bear',type:'animal',name:'BROWN BEAR',tag:'FOREST GUARDIAN',symbol:'熊',
      animalId:'bear',affinity:'forest',art:'./assets/bear-placeholder.svg',stats:{G:4,T:3,P:5},
      description:'A mighty guardian of the old forest.'},
    {id:'animal:moose',type:'animal',name:'MOUNTAIN MOOSE',tag:'HIGHLAND TITAN',symbol:'鹿',
      animalId:'moose',affinity:'highland',art:'./assets/moose-placeholder.svg',stats:{G:5,T:3,P:4},
      description:'The thunder of hooves across the highland.'},
    {id:'animal:shark',type:'animal',name:'GREAT WHITE SHARK',tag:'ABYSSAL HUNTER',symbol:'鮫',
      animalId:'shark',affinity:'ocean',art:'./assets/shark-placeholder.svg',stats:{G:3,T:5,P:4},
      description:'It swims through the air as if the forest were the sea.'},
    {id:'strong:fang',type:'strong',name:'FANG STANDARD',tag:'POWER · +8',symbol:'⚔',
      technique:'P',bonusDamage:8,effects:[],
      rules:['POWER hits +8.'],
      description:'A sharpened strike for the relentless hunter.'},
    {id:'strong:guard',type:'strong',name:'OAKEN GUARD',tag:'GUTS · +7 · GUARD',symbol:'◆',
      technique:'G',bonusDamage:7,effects:[{kind:'guard',against:'G',flat:8}],
      rules:['GUTS hits +7.','Guts hits you take -8.'],
      description:'Courage grows with every step into the wild.'},
    {id:'strong:wind',type:'strong',name:'WIND DANCER',tag:'TECHNIQUE · +9 · TIE',symbol:'〰',
      technique:'T',bonusDamage:9,effects:[{kind:'tieWin',technique:'T'}],
      rules:['TECHNIQUE hits +9.','Win any power tie when you chose Technique.'],
      description:'Move like rain between the branches.'},
    {id:'strong:ember',type:'strong',name:'EMBER CLAW',tag:'POWER · +11 · REEL',symbol:'✶',
      technique:'P',bonusDamage:11,effects:[{kind:'reel',phase:'ATTACK',add:['P']}],
      rules:['POWER hits +11.','An extra P on your attack reel.'],
      description:'The final spark before the leap.'},
    {id:'strong:iron',type:'strong',name:'IRON HEART',tag:'GUTS · +10 · SURVIVOR',symbol:'✦',
      technique:'G',bonusDamage:10,effects:[{kind:'revive',share:.4}],
      rules:['GUTS hits +10.','Resurrection brings you back on 40% instead of 25%.'],
      description:'A spirit that refuses to bend.'},
    {id:'miracle:meteor',type:'miracle',name:'FALLING STAR',tag:'✦ +10 · DOUBLE STAR',symbol:'✷',
      affinity:'forest',fits:['bear'],bonusDamage:10,effects:[{kind:'reel',phase:'POWER',add:['MARK']}],
      rules:['✦ hits +10.','A second ✦ on your power reel.'],
      description:'A comet passes over the canopy.'},
    {id:'miracle:dawn',type:'miracle',name:'DAWN CHORUS',tag:'✦ +9 · MENDING',symbol:'☼',
      affinity:'highland',fits:['moose'],bonusDamage:9,effects:[{kind:'regen',hp:8,below:.5}],
      rules:['✦ hits +9.','Each new round, heal 8 (400) while at half health or less.'],
      description:'The first golden light finds its voice.'},
    {id:'miracle:storm',type:'miracle',name:'STORM BELL',tag:'✦ +14 · PIERCE',symbol:'ϟ',
      affinity:'all',fits:['bear','moose','shark'],bonusDamage:14,effects:[{kind:'pierce'}],
      rules:['✦ hits +14.','Your ✦ hits break through Focus Guard.'],
      description:'Thunder answers a distant call.'},
    {id:'miracle:tidal',type:'miracle',name:'TIDAL WISH',tag:'✦ +12 · TIDE GUARD',symbol:'◈',
      affinity:'ocean',fits:['shark'],bonusDamage:12,effects:[{kind:'guard',against:'T',cut:.4}],
      rules:['✦ hits +12.','Technique hits you take are cut by 40%.'],
      description:'Even the sea carries a promise.'},
    {id:'miracle:eclipse',type:'miracle',name:'ECLIPSE OATH',tag:'✦ +15 · LAST LIGHT',symbol:'☾',
      affinity:'all',fits:['bear','moose','shark'],bonusDamage:15,
      effects:[{kind:'desperate',below:1/3,strip:[40,50,'MARK']}],
      rules:['✦ hits +15.','At a third of your health or less, your power reel is only 40, 50 and ✦.'],
      description:'A crown of night over the savanna.'}
  ].map(card=>Object.freeze({...card,
    effects:Object.freeze((card.effects||[]).map(e=>Object.freeze({...e,source:card.name}))),
    rules:Object.freeze(card.rules||[]),fits:card.fits?Object.freeze(card.fits):undefined,
    stats:card.stats?Object.freeze(card.stats):undefined})));
  const BY_ID=Object.freeze(Object.fromEntries(CARDS.map(card=>[card.id,card])));
  const STARTER_IDS=Object.freeze(['animal:bear','animal:moose','animal:shark','strong:fang','strong:guard','miracle:meteor','miracle:dawn','miracle:tidal']);
  // Solo CPU fighters carry a fitting deck of their own (cards the player
  // can also earn), so effects cut both ways.
  const CPU_DECKS=Object.freeze({
    bear:Object.freeze({strong:'strong:fang',miracle:'miracle:meteor'}),
    moose:Object.freeze({strong:'strong:guard',miracle:'miracle:dawn'}),
    shark:Object.freeze({strong:'strong:wind',miracle:'miracle:tidal'})
  });
  const fits=(miracle,animalId)=>Boolean(miracle?.fits?.includes(animalId));
  const DEFAULT_DECKS=Object.freeze({
    p1:Object.freeze({animal:'animal:bear',strong:'strong:fang',miracle:'miracle:meteor'}),
    p2:Object.freeze({animal:'animal:moose',strong:'strong:guard',miracle:'miracle:dawn'})
  });
  // Backward-compatible local-save upgrade. Older Tiger/Lion Animal cards
  // convert to the active Bear/Moose choices without losing earned cards or wins.
  const LEGACY_IDS=Object.freeze({'animal:bear':'animal:tiger','animal:moose':'animal:lion'});
  const migrateAnimal=id=>id==='animal:tiger'?'animal:bear':
    id==='animal:lion'?'animal:moose':id;
  const safeCount=n=>Number.isSafeInteger(n)&&n>=0&&n<=99?n:0;
  const clone=obj=>JSON.parse(JSON.stringify(obj));
  const init=()=>({schema:1,inventory:Object.fromEntries(CARDS.map(c=>[c.id,STARTER_IDS.includes(c.id)?1:0])),
    decks:clone(DEFAULT_DECKS),wins:0,lastReward:null});
  function clean(raw){
    const result=init();
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==1)return result;
    for(const card of CARDS){
      const count=safeCount(raw.inventory?.[card.id]??raw.inventory?.[LEGACY_IDS[card.id]]);
      result.inventory[card.id]=STARTER_IDS.includes(card.id)?Math.max(1,count):count;
    }
    for(const side of ['p1','p2']){
      for(const type of TYPES){
        const id=migrateAnimal(raw.decks?.[side]?.[type]);
        if(typeof id==='string'&&BY_ID[id]?.type===type&&result.inventory[id]>0)
          result.decks[side][type]=id;
      }
    }
    result.wins=Number.isSafeInteger(raw.wins)?Math.max(0,Math.min(1000000,raw.wins)):0;
    const reward=migrateAnimal(raw.lastReward);
    if(typeof reward==='string'&&BY_ID[reward])result.lastReward=reward;
    return result;
  }
  // Engine modifiers for one fighter: the Animal card's G/T/P levels, the
  // Strong card's boost + effect, the Miracle's ✦ damage (+4 and its
  // special effect only on an animal it fits).
  function modifiersFor(animal,strong,miracle){
    const none={strongTechnique:null,strongBonus:0,miracleBonus:0,strongName:null,miracleName:null,effects:[],fits:null};
    if(!animal)return none;
    strong=strong?.type==='strong'?strong:null;miracle=miracle?.type==='miracle'?miracle:null;
    const fit=miracle?fits(miracle,animal.animalId):null;
    const effects=[{kind:'stat',...animal.stats,source:animal.name}];
    if(strong)effects.push(...strong.effects);
    if(miracle&&fit)effects.push(...miracle.effects);
    return {
      strongTechnique:strong?strong.technique:null,strongBonus:strong?strong.bonusDamage:0,
      miracleBonus:miracle?miracle.bonusDamage+(fit?4:0):0,
      strongName:strong?strong.name:null,miracleName:miracle?miracle.name:null,
      effects:JSON.parse(JSON.stringify(effects)),fits:fit
    };
  }
  function cpuModifiers(animalId){
    const animal=BY_ID['animal:'+animalId],deck=CPU_DECKS[animalId];
    return modifiersFor(animal,deck?BY_ID[deck.strong]:null,deck?BY_ID[deck.miracle]:null);
  }
  function createStore(storage){
    let state=init();
    let persistence='memory';
    try{
      const raw=storage?.getItem(KEY);
      if(raw)state=clean(JSON.parse(raw));
      if(storage){storage.setItem(KEY,JSON.stringify(state));persistence='browser';}
    }catch{persistence='memory';}
    function persist(){
      try{if(storage){storage.setItem(KEY,JSON.stringify(state));persistence='browser';}}catch{persistence='memory';}
      return persistence;
    }
    function getState(){return clone({...state,persistence});}
    function getCard(id){return BY_ID[id]?{...BY_ID[id]}:null;}
    function getDeck(side='p1'){return clone(state.decks[side==='p2'?'p2':'p1']);}
    function equip(side,id){
      if(side!=='p1'&&side!=='p2')return false;
      const card=BY_ID[id];
      if(!card||!state.inventory[id])return false;
      state.decks[side][card.type]=id;
      persist();
      return true;
    }
    function unequip(side,type){
      if(!['p1','p2'].includes(side)||!['strong','miracle'].includes(type))return false;
      state.decks[side][type]=null;
      persist();
      return true;
    }
    function grantReward(rng=Math.random){
      if(typeof rng!=='function')throw new TypeError('Random source must be a function');
      const locked=CARDS.filter(c=>state.inventory[c.id]===0);
      const eligible=locked.length?locked:CARDS.filter(c=>state.inventory[c.id]<99);
      if(!eligible.length)return null;
      const value=Number(rng());
      const bounded=Number.isFinite(value)?Math.max(0,Math.min(0.999999,value)):0;
      const card=eligible[Math.floor(bounded*eligible.length)];
      const first=state.inventory[card.id]===0;
      state.inventory[card.id]++;
      state.wins=Math.min(1000000,state.wins+1);
      state.lastReward=card.id;
      persist();
      return {...card,newCard:first,count:state.inventory[card.id]};
    }
    function getModifiers(side='p1',animalId){
      const deck=getDeck(side);
      const actual=BY_ID['animal:'+animalId];
      // The battle animal selected must match the card in this slot;
      // never apply a stored bonus to a different animal by accident.
      if(!actual||deck.animal!==actual.id)return modifiersFor(null,null,null);
      const owned=id=>id&&state.inventory[id]>0?BY_ID[id]:null;
      return modifiersFor(actual,owned(deck.strong),owned(deck.miracle));
    }
    function exportSave(){return JSON.stringify({schema:1,inventory:state.inventory,
      decks:state.decks,wins:state.wins,lastReward:state.lastReward},null,2);}
    function importSave(value){
      if(typeof value!=='string'||value.length>32000)return false;
      let raw;
      try{raw=JSON.parse(value);}catch{return false;}
      if(!raw||raw.schema!==1||typeof raw.inventory!=='object'||!raw.inventory||
         Array.isArray(raw.inventory)||typeof raw.decks!=='object'||!raw.decks)return false;
      state=clean(raw);persist();return true;
    }
    return Object.freeze({getState,getCard,getDeck,equip,unequip,grantReward,getModifiers,
      exportSave,importSave,getPersistence:()=>persistence});
  }
  return Object.freeze({KEY,CARDS,TYPES,STARTER_IDS,CPU_DECKS,BY_ID,init,clean,createStore,modifiersFor,cpuModifiers,fits});
});
