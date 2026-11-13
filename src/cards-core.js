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
  const CARDS=Object.freeze([
    {id:'animal:tiger',type:'animal',name:'BLUE TIGER',tag:'STRIPED HUNTER',symbol:'虎',
      animalId:'tiger',affinity:'forest',art:'./assets/tiger-illustration.webp',
      description:'A shadow at the edge of the moonlit forest.'},
    {id:'animal:lion',type:'animal',name:'GOLDEN LION',tag:'SAVANNA KING',symbol:'獅',
      animalId:'lion',affinity:'sun',art:'./assets/lion-illustration.webp',
      description:'The guardian of an endless golden horizon.'},
    {id:'strong:fang',type:'strong',name:'FANG STANDARD',tag:'POWER · +8',symbol:'⚔',
      technique:'P',bonusDamage:8,description:'A sharpened strike for the relentless hunter.'},
    {id:'strong:guard',type:'strong',name:'OAKEN GUARD',tag:'GUTS · +7',symbol:'◆',
      technique:'G',bonusDamage:7,description:'Courage grows with every step into the wild.'},
    {id:'strong:wind',type:'strong',name:'WIND DANCER',tag:'TECHNIQUE · +9',symbol:'〰',
      technique:'T',bonusDamage:9,description:'Move like rain between the branches.'},
    {id:'strong:ember',type:'strong',name:'EMBER CLAW',tag:'POWER · +11',symbol:'✶',
      technique:'P',bonusDamage:11,description:'The final spark before the leap.'},
    {id:'strong:iron',type:'strong',name:'IRON HEART',tag:'GUTS · +10',symbol:'✦',
      technique:'G',bonusDamage:10,description:'A spirit that refuses to bend.'},
    {id:'miracle:meteor',type:'miracle',name:'FALLING STAR',tag:'✦ MARK · +10',symbol:'✷',
      affinity:'forest',bonusDamage:10,description:'A comet passes over the canopy.'},
    {id:'miracle:dawn',type:'miracle',name:'DAWN CHORUS',tag:'✦ MARK · +9',symbol:'☼',
      affinity:'sun',bonusDamage:9,description:'The first golden light finds its voice.'},
    {id:'miracle:storm',type:'miracle',name:'STORM BELL',tag:'✦ MARK · +14',symbol:'ϟ',
      affinity:'forest',bonusDamage:14,description:'Thunder answers a distant call.'},
    {id:'miracle:tidal',type:'miracle',name:'TIDAL WISH',tag:'✦ MARK · +12',symbol:'◈',
      affinity:'all',bonusDamage:12,description:'Even the sea carries a promise.'},
    {id:'miracle:eclipse',type:'miracle',name:'ECLIPSE OATH',tag:'✦ MARK · +15',symbol:'☾',
      affinity:'sun',bonusDamage:15,description:'A crown of night over the savanna.'}
  ].map(card=>Object.freeze(card)));
  const BY_ID=Object.freeze(Object.fromEntries(CARDS.map(card=>[card.id,card])));
  const STARTER_IDS=Object.freeze(['animal:tiger','animal:lion','strong:fang','strong:guard','miracle:meteor','miracle:dawn']);
  const DEFAULT_DECKS=Object.freeze({
    p1:Object.freeze({animal:'animal:tiger',strong:'strong:fang',miracle:'miracle:meteor'}),
    p2:Object.freeze({animal:'animal:lion',strong:'strong:guard',miracle:'miracle:dawn'})
  });
  const safeCount=n=>Number.isSafeInteger(n)?Math.max(0,Math.min(99,n)):0;
  const clone=obj=>JSON.parse(JSON.stringify(obj));
  const init=()=>({schema:1,inventory:Object.fromEntries(CARDS.map(c=>[c.id,STARTER_IDS.includes(c.id)?1:0])),
    decks:clone(DEFAULT_DECKS),wins:0,lastReward:null});
  function clean(raw){
    const result=init();
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==1)return result;
    for(const card of CARDS){
      const count=safeCount(raw.inventory?.[card.id]);
      result.inventory[card.id]=STARTER_IDS.includes(card.id)?Math.max(1,count):count;
    }
    for(const side of ['p1','p2']){
      for(const type of TYPES){
        const id=raw.decks?.[side]?.[type];
        if(typeof id==='string'&&BY_ID[id]?.type===type&&result.inventory[id]>0)
          result.decks[side][type]=id;
      }
    }
    result.wins=Number.isSafeInteger(raw.wins)?Math.max(0,Math.min(1000000,raw.wins)):0;
    if(typeof raw.lastReward==='string'&&BY_ID[raw.lastReward])
      result.lastReward=raw.lastReward;
    return result;
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
      const deck=getDeck(side),strong=BY_ID[deck.strong],miracle=BY_ID[deck.miracle];
      const actual=BY_ID['animal:'+animalId];
      const sameAnimal=actual&&deck.animal===actual.id;
      // The battle animal selected must match the card in this slot;
      // never apply a stored bonus to a different animal by accident.
      if(!sameAnimal)return {strongTechnique:null,strongBonus:0,miracleBonus:0,
        strongName:null,miracleName:null};
      return {
        strongTechnique:strong?.type==='strong'&&state.inventory[strong.id]>0?strong.technique:null,
        strongBonus:strong?.type==='strong'&&state.inventory[strong.id]>0?strong.bonusDamage:0,
        miracleBonus:miracle?.type==='miracle'&&state.inventory[miracle.id]>0?
          miracle.bonusDamage+(miracle.affinity===actual.affinity?4:0):0,
        strongName:strong?.type==='strong'&&state.inventory[strong.id]>0?strong.name:null,
        miracleName:miracle?.type==='miracle'&&state.inventory[miracle.id]>0?miracle.name:null
      };
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
  return Object.freeze({KEY,CARDS,TYPES,STARTER_IDS,BY_ID,init,clean,createStore});
});
