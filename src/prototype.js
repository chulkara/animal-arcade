/* Noah's Arkade Phase 2: honest presentation prototype, not a combat engine. */
(function(){
  'use strict';
  const animals={
    tiger:{name:'BLUE TIGER',type:'STRIPED HUNTER',art:'./assets/tiger-illustration.webp',legend:'A silent stalker of the wild.'},
    lion:{name:'GOLDEN LION',type:'SAVANNA KING',art:'./assets/lion-illustration.webp',legend:'A fierce guardian of the plains.'}
  };
  const state={mode:'SOLO',picks:[],phase:'INTRO'};
  const ui=document.getElementById('ui');
  function open(screen){window.__arkade?.openScreen(screen);}
  function start(mode){
    state.mode=mode==='DUEL'?'DUEL':'SOLO';
    state.picks=[];
    state.phase='INTRO';
    open('ANIMAL_SELECT');
  }
  function choose(id){
    if(!Object.prototype.hasOwnProperty.call(animals,id))return;
    if(state.mode==='SOLO'){
      window.NoahsCards?.equipAnimal(0,id);
      state.picks=[id,id==='tiger'?'lion':'tiger'];
      state.phase='INTRO';
      open('BATTLE_STAGE');return;
    }
    if(state.picks.length>=2)return;
    window.NoahsCards?.equipAnimal(state.picks.length,id);
    state.picks.push(id);
    if(state.picks.length===2){state.phase='INTRO';open('BATTLE_STAGE');}
    else open('ANIMAL_SELECT');
  }
  function resetToSelect(){state.picks=[];state.phase='INTRO';open('ANIMAL_SELECT');}
  function showIntro(){if(state.picks.length!==2)return;state.phase='READY';open('BATTLE_STAGE');}
  function selectScreen(){
    const turn=state.mode==='DUEL'?state.picks.length+1:1;
    return `<section class="panel animal-select-panel screen-copy" aria-label="Choose your animal">
      <div class="section-eyebrow">THE WILD CHOOSES ITS CHAMPION</div>
      <h1 class="panel-title">SELECT YOUR ANIMAL</h1>
      <p class="prototype-status">${state.mode==='SOLO'?'1 PLAYER · OPPONENT ASSIGNED AUTOMATICALLY':'2 PLAYERS · PLAYER '+turn+' SELECTS'}</p>
      <div class="animal-grid">
        ${Object.entries(animals).map(([id,animal],i)=>`<button type="button" data-animal="${id}" class="animal-choice" ${i===0?'data-initial-focus':''}>
          <span class="animal-art"><img src="${animal.art}" alt="" loading="eager"></span>
          <strong>${animal.name}</strong>
          <small>${animal.type}</small>
          <span class="animal-legend">${animal.legend}</span>
        </button>`).join('')}
      </div>
      <p class="prototype-note">Prototype roster: Blue Tiger and Golden Lion. Each selection uses that player's equipped Strong and Miracle cards from the Battle Binder.</p>
      <button type="button" class="arcade-back" data-prototype-mode>← BACK TO PLAY MENU</button>
    </section>`;
  }
  function stageScreen(){
    if(state.picks.length!==2)return selectScreen();
    const [left,right]=state.picks.map(id=>animals[id]);
    return `<section class="panel battle-stage-panel screen-copy ${state.phase==='READY'?'battle-ready':''}" aria-label="Battle stage prototype">
      <div class="section-eyebrow">THE ARENA AWAITS</div>
      <h1 class="panel-title">BATTLE STAGE</h1>
      <p class="prototype-status">${state.mode==='SOLO'?'SINGLE PLAYER · PRESENTATION':'LOCAL TWO-PLAYER · PRESENTATION'}</p>
      <div class="arena" aria-label="Animal matchup">
        <div class="arena-fighter">
          <div class="arena-health"><span>PLAYER 1</span><div aria-hidden="true"><i></i></div></div>
          <img src="${left.art}" alt="" class="arena-animal">
          <strong>${left.name}</strong>
        </div>
        <div class="arena-versus" aria-hidden="true">VS</div>
        <div class="arena-fighter">
          <div class="arena-health"><span>${state.mode==='SOLO'?'CPU':'PLAYER 2'}</span><div aria-hidden="true"><i></i></div></div>
          <img src="${right.art}" alt="" class="arena-animal">
          <strong>${right.name}</strong>
        </div>
      </div>
      <p class="prototype-announcer" role="status">${state.phase==='READY'?'THE STAGE IS SET!':'TWO LEGENDS ENTER THE WILD'}</p>
      <p class="prototype-note">This is the illustrated staging preview. Select START BATTLE to enter the playable two-slot combat prototype. Card effects and historical damage formulas are not implemented.</p>
      <div class="prototype-actions">
        ${state.phase!=='READY'?'<button type="button" data-prototype-intro data-initial-focus>BEGIN INTRO</button>':'<button type="button" data-prototype-fight data-initial-focus>START BATTLE · BETA</button>'}
        <button type="button" data-prototype-restart ${state.phase==='READY'?'data-initial-focus':''}>CHOOSE AGAIN</button>
        <button type="button" data-prototype-menu>MAIN MENU</button>
      </div>
    </section>`;
  }
  function render(screen){return screen==='ANIMAL_SELECT'?selectScreen():stageScreen();}
  ui.addEventListener('click',event=>{
    const target=event.target;
    const card=target.closest('[data-animal]');
    if(card){choose(card.dataset.animal);return;}
    if(target.closest('[data-prototype-intro]')){showIntro();return;}
    if(target.closest('[data-prototype-fight]')&&state.phase==='READY'&&state.picks.length===2){
      window.NoahsCombat?.start({mode:state.mode,picks:[...state.picks]});
      return;
    }
    if(target.closest('[data-prototype-restart]')){resetToSelect();return;}
    if(target.closest('[data-prototype-menu]')){state.picks=[];open('MAIN_MENU');return;}
    if(target.closest('[data-prototype-mode]')){state.picks=[];open('MODE_MENU');}
  });
  window.NoahsPrototype={start,render,resetToSelect,getState:()=>({...state,picks:[...state.picks]})};
})();
