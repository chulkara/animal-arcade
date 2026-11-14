/* Active roster: exactly two approved animals. Tiger V4 remains archived.
 * Public SVG placeholders are original artwork; private FBX assets are NOT hosted.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.NoahsRoster=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const ANIMALS=Object.freeze({
  bear:Object.freeze({id:'bear',name:'BROWN BEAR',label:'BROWN BEAR',type:'FOREST BRUISER',
    art:'./assets/bear-portrait.svg',legend:'A mountain of strength beneath the pines.',
    symbol:'熊',affinity:'forest',
    moves:Object.freeze({G:'THUNDER CHARGE',T:'LOW CLAW',P:'HIGH CLAW',special:'FERAL STRIKE'})}),
  moose:Object.freeze({id:'moose',name:'MOOSE',label:'MOOSE',type:'ANTLERED TITAN',
    art:'./assets/moose-portrait.svg',legend:'An antler-crowned force of the northern wild.',
    symbol:'✦',affinity:'forest',
    moves:Object.freeze({G:'ANTLER CHARGE',T:'CROSS-ANTLER SWEEP',P:'HOOF STOMP',special:'LEAPING DRIVE'})})
 });
 const IDS=Object.freeze(Object.keys(ANIMALS));
 const get=id=>Object.hasOwn(ANIMALS,id)?ANIMALS[id]:null;
 const opponent=id=>{if(!get(id))throw new RangeError('Unknown animal');return IDS.find(x=>x!==id);};
 const validPicks=picks=>Array.isArray(picks)&&picks.length===2&&picks.every(id=>Boolean(get(id)));
 return Object.freeze({ANIMALS,IDS,get,opponent,validPicks});
});