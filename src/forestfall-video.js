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
  const CONTACT_RATIO=.755;
  const REACTION_MS=1120;
  const fmt=n=>Math.max(0,Math.round(Number(n)||0));
  const onBattle=()=>window.__arkade?.getScreen()==='BATTLE_PLAY';
  const battle=()=>window.NoahsCombat?.getState();
  function updateControls(){
    const ready=Boolean(objectUrl);
    const preview=ui.querySelector('[data-forestfall-preview]');
    if(preview)preview.disabled=!ready;
    const label=ui.querySelector('[data-forestfall-status]');
    if(label)label.textContent=ready?'FORESTFALL READY · '+fileName:
      'Choose the 1080p Forestfall MP4. Stored only for this session.';
  }
  function close(focus=false){
    if(!active)return;
    const {node,video}=active;
    active=null;
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
    // Preview is deliberately non-scoring. It must work even while the
    // attack/power reel is spinning: the old silent phase guard made the
    // enabled PREVIEW button appear completely broken.
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
      damage.textContent='−'+fmt(event.damage)+' HP';
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
    node.append(video,title,result,reaction,status,controls);
    document.body.append(node);
    document.getElementById('game')?.setAttribute('inert','');
    document.body.classList.add('ark-forestfall-open');
    active={node,video,preview,event};
    window.dispatchEvent(new CustomEvent('arkade:forestfallopen',{
      detail:{preview,eventKey:event?.key||null}}));
    let hitShown=false,reactionUntil=null;
    const showHit=()=>{
      if(preview||hitShown||!event)return;
      const duration=Number.isFinite(video.duration)&&video.duration>1?
        video.duration:14.93;
      // Source video: dust/ground contact appears around 11.2 seconds.
      if(video.currentTime<duration*CONTACT_RATIO)return;
      hitShown=true;
      const damage=Math.max(0,Number(event.damage)||0);
      const name=window.NoahsRoster?.ANIMALS?.[event.defenderId]?.label||
        event.defenderId.toUpperCase();
      result.textContent=name.toUpperCase()+' · −'+damage+' HP';
      node.classList.add('ark-forestfall-impact','ark-forestfall-reaction-visible');
      reactionUntil=video.currentTime+REACTION_MS/1000;
      // The MP4 shows a landing but no struck animal. This inset supplies
      // an actual defender reaction and recorded HP without pretending to
      // change the video, reapply damage, or access private FBX binaries.
      status.textContent='SPECIAL CONNECTED · RESULT ALREADY RECORDED';
    };
    const syncContact=()=>{
      if(!active||active.node!==node)return;
      showHit();
      if(reactionUntil!==null&&video.currentTime>=reactionUntil){
        node.classList.remove('ark-forestfall-reaction-visible');
        reactionUntil=null;
      }
    };
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
    getStatus:()=>({ready:Boolean(objectUrl),fileName,playing:Boolean(active)}),
    preview:()=>playVideo({preview:true})
  });
})();