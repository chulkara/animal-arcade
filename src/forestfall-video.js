/* Optional local Forestfall cinematic. This video is not an FBX motion clip.
 * It is a camera-rendered cutscene; NoahsCombat remains authoritative for
 * damage, HP, winners, match rewards and all player decisions.
 *
 * Only File/Blob URLs are used. Video bytes never leave this browser session.
 */
(function(){
  'use strict';
  const ui=document.getElementById('ui');
  if(!ui)return;
  const MAX_BYTES=100*1024*1024;
  const MIME=/^video\/(mp4|webm)$/;
  let objectUrl=null,fileName='',active=null,lastKey=null;
  const impactCore=window.NoahsForestfallCollisionCore;
  const CONTACT_RATIO=impactCore?.CONTACT/impactCore?.SOURCE_SECONDS||11.82/14.93;
  const REACTION_MS=1120;
  const fmt=n=>Math.max(0,Math.round(Number(n)||0));
  const onBattle=()=>window.__arkade?.getScreen()==='BATTLE_PLAY';
  const battle=()=>window.NoahsCombat?.getState();
  function updateControls(){
    const ready=Boolean(objectUrl);
    const preview=ui.querySelector('[data-forestfall-preview]');
    if(preview)preview.disabled=!ready;
    const label=ui.querySelector('[data-forestfall-status]');
    if(label){
      const assets=window.NoahsArena3D?.getStatus?.();
      const match=battle();
      const versusMoose=match?.animals?.some(animal=>animal.id==='moose');
      const mode=assets?.bear&&assets?.moose&&versusMoose?
        ' · LIVE BEAR + MOOSE FBX CONTACT READY':
        ' · VIDEO MODE · LOAD BOTH 3D MODELS FOR PHYSICAL IMPACT';
      label.textContent=ready?'FORESTFALL READY · '+fileName+mode:
        'Choose the 1080p Forestfall MP4. Stored only for this session.';
    }
  }
  function close(focus=false){
    if(!active)return;
    const {node,video,collision,raf}=active;
    active=null;
    if(raf)cancelAnimationFrame(raf);
    collision?.stop();
    video.pause();
    video.removeAttribute('src');
    video.load();
    node.remove();
    document.getElementById('game')?.removeAttribute('inert');
    document.body.classList.remove('ark-forestfall-open');
    window.dispatchEvent(new CustomEvent('arkade:forestfallclose'));
    if(focus&&onBattle()){
      (ui.querySelector('[data-combat-next],[data-combat-next-bout],'+
        '[data-combat-rematch],[data-forestfall-preview]'))?.focus();
    }
  }
  function setFile(file){
    if(!file||!MIME.test(file.type)&&!/\.(mp4|webm)$/i.test(file.name)){
      return 'Choose an MP4 or WebM file.';
    }
    if(!file.size||file.size>MAX_BYTES)return 'Video must be between 1 byte and 100 MB.';
    close();
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(file);
    fileName=file.name;
    lastKey=null;
    updateControls();
    return null;
  }
  function playVideo({event=null,preview=false}={}){
    const report=message=>{
      const label=ui.querySelector('[data-forestfall-status]');
      if(label)label.textContent=message;
      return false;
    };
    if(!objectUrl)return report('Load the Forestfall MP4 before previewing it.');
    if(active)return false;
    if(!onBattle())return report('Open a battle to preview Forestfall.');
    if(window.NoahsArena3D?.getReviewState?.()?.active)
      return report('Stop the Bear cinematic review before opening Forestfall.');
    // Preview is deliberately non-scoring. It must work while the reel
    // spins and show the same opponent cut-in without pretending damage
    // was dealt or modifying the real state.
    const state=battle();
    if(preview&&!event&&state?.animals?.length===2){
      const bearIndex=state.animals.findIndex(animal=>animal.id==='bear');
      if(bearIndex>=0){
        const defender=1-bearIndex;
        event={attacker:bearIndex,attackerId:'bear',
          defender,defenderId:state.animals[defender].id,
          damage:0,remainingHp:state.animals[defender].hp,
          knockout:false,preview:true};
      }
    }
    const node=document.createElement('section');
    node.className='ark-forestfall';
    node.setAttribute('role','dialog');
    node.setAttribute('aria-modal','true');
    node.setAttribute('aria-label','Forestfall Bear special move');
    const title=document.createElement('div');
    title.className='ark-forestfall-title';
    title.textContent='BROWN BEAR · FORESTFALL';
    const video=document.createElement('video');
    video.className='ark-forestfall-video';
    video.setAttribute('playsinline','');
    video.playsInline=true;
    video.preload='auto';
    video.src=objectUrl;
    const settings=window.__arkade?.getSettings?.()||{};
    const master=Math.max(0,Math.min(1,(Number(settings.master??100))/100));
    const effects=Math.max(0,Math.min(1,(Number(settings.sfx??100))/100));
    video.volume=master*effects;
    video.muted=Boolean(settings.mute)||video.volume===0;
    const reduced=Boolean(settings.reducedMotion)||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    // Keep the actual video as the camera source until its Bear lands.
    // A separate native-FBX scene is match-cut into that same 16:9 window
    // for ~1.7 seconds if both private animals were loaded locally.
    const media=document.createElement('div');
    media.className='ark-forestfall-media';
    const nativeStage=document.createElement('div');
    nativeStage.className='ark-forestfall-native-stage';
    nativeStage.setAttribute('aria-hidden','true');
    media.append(video,nativeStage);
    const result=document.createElement('div');
    result.className='ark-forestfall-result';
    result.setAttribute('aria-live','polite');
    const reaction=document.createElement('div');
    reaction.className='ark-forestfall-reaction';
    reaction.setAttribute('aria-hidden','true');
    const species=event?.defenderId&&window.NoahsRoster?.ANIMALS?.[event.defenderId];
    const target=species?.label||event?.defenderId?.toUpperCase()||'OPPONENT';
    if(event&&species){
      const animal=document.createElement('img');
      animal.className='ark-forestfall-target-art';
      animal.src=species.art;
      animal.alt='';
      const copy=document.createElement('div');
      copy.className='ark-forestfall-target-copy';
      const name=document.createElement('strong');
      name.textContent=target;
      const damage=document.createElement('span');
      damage.className='ark-forestfall-hit-damage';
      damage.textContent=preview?'PREVIEW · NO HP CHANGE':
        '−'+fmt(event.damage)+' HP';
      const health=document.createElement('small');
      const fighter=battle()?.animals?.[event.defender];
      const max=fmt(fighter?.maxHp)||Math.max(1,fmt(event.remainingHp+event.damage));
      const remains=Math.min(max,fmt(event.remainingHp));
      const previous=Math.min(max,remains+fmt(event.damage));
      health.textContent=remains+' / '+max+' HP';
      const meter=document.createElement('div');
      meter.className='ark-forestfall-target-health';
      meter.setAttribute('aria-hidden','true');
      const fill=document.createElement('span');
      fill.style.setProperty('--hp-before',100*previous/max+'%');
      fill.style.setProperty('--hp-after',100*remains/max+'%');
      meter.append(fill);
      copy.append(name,damage,meter,health);
      reaction.append(animal,copy);
    }
    const status=document.createElement('p');
    status.className='ark-forestfall-status';
    status.textContent=preview?'LOCAL VIDEO PREVIEW · NO DAMAGE':
      'BEAR SPECIAL ATTACK · IMPACT PENDING';
    const controls=document.createElement('div');
    controls.className='ark-forestfall-controls';
    const resume=document.createElement('button');
    resume.type='button';resume.textContent='PLAY FORESTFALL';
    resume.hidden=true;
    const skip=document.createElement('button');
    skip.type='button';skip.textContent=preview?'CLOSE PREVIEW':'SKIP CINEMATIC';
    skip.addEventListener('click',()=>close(true));
    resume.addEventListener('click',()=>{
      video.play().then(()=>{resume.hidden=true;}).catch(()=>{
        status.textContent=(preview?'LOCAL VIDEO PREVIEW · NO DAMAGE · ':'')+
        'Could not play this video. Use SKIP CINEMATIC.';
      });
    });
    controls.append(resume,skip);
    node.append(media,title,result,reaction,status,controls);
    document.body.append(node);
    document.getElementById('game')?.setAttribute('inert','');
    document.body.classList.add('ark-forestfall-open');
    const collision=window.NoahsArena3D?.createForestfallCollision?.({
      host:nativeStage,event})||null;
    active={node,video,preview,event,collision,raf:0};
    node.dataset.collision=collision?'native-fbx':'video-fallback';
    window.dispatchEvent(new CustomEvent('arkade:forestfallopen',{
      detail:{preview,eventKey:event?.key||null}}));
    let hitShown=false,reactionUntil=null;
    const showHit=()=>{
      if(hitShown||!event)return;
      const duration=Number.isFinite(video.duration)&&video.duration>1?
        video.duration:14.93;
      // Film inspection: front paws meet the ground around 11.82s,
      // and the source's dust burst follows at 12.06s.
      if(video.currentTime<duration*CONTACT_RATIO)return;
      hitShown=true;
      const damage=Math.max(0,Number(event.damage)||0);
      const name=window.NoahsRoster?.ANIMALS?.[event.defenderId]?.label||
        event.defenderId.toUpperCase();
      result.textContent=preview?'PREVIEW · NO HP CHANGE':
        name.toUpperCase()+' · −'+damage+' HP';
      const live=Boolean(active?.collision);
      node.classList.add('ark-forestfall-impact');
      // Only show the old illustrated cut-in if the user has not supplied
      // both native models. During a live match-cut the actual skinned Moose
      // plays its own Hit/Knockout FBX, with no superimposed silhouette.
      if(!live)node.classList.add('ark-forestfall-reaction-visible');
      reactionUntil=video.currentTime+REACTION_MS/1000;
      status.textContent=preview?'LOCAL VIDEO PREVIEW · NO HP CHANGES':
        live?'NATIVE BEAR × MOOSE IMPACT · REAL FBX REACTION':
          'SPECIAL CONNECTED · RESULT ALREADY RECORDED';
    };
    const syncContact=()=>{
      if(!active||active.node!==node)return;
      const duration=Number.isFinite(video.duration)&&video.duration>1?
        video.duration:14.93;
      const frame=impactCore?.at(video.currentTime,duration);
      if(active.collision&&frame?.live){
        try{
          const rendered=active.collision.update(video.currentTime,duration);
          node.classList.toggle('ark-forestfall-3d-live',Boolean(rendered));
        }catch(error){
          // Loss of a second WebGL context must never strand the player
          // in a black screen or change their already scored result.
          const failed=active.collision;active.collision=null;
          try{failed.stop();}catch(_ignored){}
          node.dataset.collision='video-fallback';
          node.classList.remove('ark-forestfall-3d-live');
          status.textContent='3D CONTACT UNAVAILABLE · VIDEO CONTINUES · '+
            String(error?.message||'RENDERER ERROR');
        }
      }else{
        node.classList.remove('ark-forestfall-3d-live');
      }
      showHit();
      if(reactionUntil!==null&&video.currentTime>=reactionUntil){
        node.classList.remove('ark-forestfall-reaction-visible','ark-forestfall-impact');
        result.textContent='';
        reactionUntil=null;
      }
    };
    const liveFrame=()=>{
      if(!active||active.node!==node)return;
      active.raf=0;
      syncContact();
      if(!video.paused&&!video.ended)active.raf=requestAnimationFrame(liveFrame);
    };
    video.addEventListener('play',()=>{
      if(active?.node===node&&!active.raf)
        active.raf=requestAnimationFrame(liveFrame);
    });
    video.addEventListener('pause',()=>{
      if(active?.node===node&&active.raf){
        cancelAnimationFrame(active.raf);active.raf=0;
      }
    });
    video.addEventListener('timeupdate',syncContact);
    video.addEventListener('seeked',syncContact);
    video.addEventListener('ended',()=>close(true),{once:true});
    video.addEventListener('error',()=>{
      if(!active||active.node!==node)return;
      status.textContent=(preview?'LOCAL VIDEO PREVIEW · NO DAMAGE · ':'')+
        'Video playback failed. The battle result is safe.';
      resume.hidden=true;
    });
    // A power-slot stop is a direct user gesture, so browsers may allow
    // audio. If autoplay is blocked, offer an explicit button instead.
    if(reduced){
      resume.hidden=false;
      status.textContent=(preview?'LOCAL VIDEO PREVIEW · NO DAMAGE · ':'')+
        'REDUCED MOTION ENABLED · PLAY VIDEO MANUALLY OR SKIP';
    }else{
      video.play().catch(()=>{
        if(!active||active.node!==node)return;
        resume.hidden=false;
        status.textContent=(preview?'LOCAL VIDEO PREVIEW · NO DAMAGE · ':'')+
          'SELECT PLAY FORESTFALL TO START THE CINEMATIC';
      });
    }
    skip.focus();
    return true;
  }
  ui.addEventListener('click',event=>{
    if(event.target.closest('[data-forestfall-choose]')){
      ui.querySelector('[data-forestfall-file]')?.click();
    }else if(event.target.closest('[data-forestfall-preview]')){
      // Keep this synchronous with the user's click so browsers permit
      // media playback when their autoplay policy requires a gesture.
      playVideo({preview:true});
    }
  });
  ui.addEventListener('change',event=>{
    const input=event.target.closest('[data-forestfall-file]');
    if(!input)return;
    const error=setFile(input.files?.[0]);
    const status=ui.querySelector('[data-forestfall-status]');
    if(error&&status)status.textContent=error;
    input.value='';
  });
  window.addEventListener('arkade:reelstop',event=>{
    if(!event.detail?.hit||!objectUrl||!onBattle())return;
    const s=battle(),hit=s?.lastEvent;
    if(!hit||hit.kind!=='HIT'||!hit.special||
       !['RESULT','FINISHED'].includes(s.phase))return;
    if(s.animals?.[hit.attacker]?.id!=='bear')return;
    const clipEvent=window.NoahsArena3DCore?.battleEvent(s);
    if(!clipEvent||clipEvent.key===lastKey)return;
    lastKey=clipEvent.key;
    playVideo({event:clipEvent});
  });
  window.addEventListener('arkade:screenchange',()=>{
    if(!onBattle())close();
    updateControls();
  });
  window.addEventListener('arkade:forestfall-assetschange',updateControls);
  window.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){
      event.preventDefault();
      event.stopImmediatePropagation();
      close(true);
    }else if(event.key==='Tab'){
      // The rest of the arena is inert, while video control buttons stay
      // keyboard-accessible. Loop focus inside the temporary dialog.
      const buttons=[...active.node.querySelectorAll('button:not([hidden])')];
      if(!buttons.length)return;
      const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey&&document.activeElement===last){
        event.preventDefault();first.focus();
      }
    }
  },true);
  window.addEventListener('pagehide',()=>{
    close();
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=null;
  },{once:true});
  window.NoahsForestfall=Object.freeze({
    getStatus:()=>({ready:Boolean(objectUrl),fileName,playing:Boolean(active),
      collision:active?.collision?.mode||'video-fallback'}),
    preview:()=>playVideo({preview:true})
  });
})();