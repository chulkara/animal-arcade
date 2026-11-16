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
    if(!objectUrl||active||!onBattle())return false;
    if(window.NoahsArena3D?.getReviewState?.()?.active)return false;
    const s=battle();
    // Never start an informational preview while a timed reel is active.
    if(preview&&['ATTACK','POWER'].includes(s?.phase))return false;
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
    video.muted=Boolean(window.__arkade?.getSettings()?.mute);
    const result=document.createElement('div');
    result.className='ark-forestfall-result';
    result.setAttribute('aria-live','polite');
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
        status.textContent='Could not play this video. Use SKIP CINEMATIC.';
      });
    });
    controls.append(resume,skip);
    node.append(video,title,result,status,controls);
    document.body.append(node);
    active={node,video};
    let hitShown=false;
    const showHit=()=>{
      if(preview||hitShown||!event)return;
      const duration=Number.isFinite(video.duration)&&video.duration>1?
        video.duration:14.93;
      // Source video: dust/ground contact appears around 11.2 seconds.
      if(video.currentTime<duration*.755)return;
      hitShown=true;
      const damage=Math.max(0,Number(event.damage)||0);
      const name=window.NoahsRoster?.ANIMALS?.[event.defenderId]?.label||
        event.defenderId.toUpperCase();
      result.textContent=name.toUpperCase()+' · −'+damage+' HP';
      node.classList.add('ark-forestfall-impact');
      status.textContent='SPECIAL CONNECTED · RESULT ALREADY RECORDED';
    };
    video.addEventListener('timeupdate',showHit);
    video.addEventListener('ended',()=>close(true),{once:true});
    video.addEventListener('error',()=>{
      if(!active||active.node!==node)return;
      status.textContent='Video playback failed. The battle result is safe.';
      resume.hidden=true;
    });
    // A power-slot stop is a direct user gesture, so browsers may allow
    // audio. If autoplay is blocked, offer an explicit button instead.
    video.play().catch(()=>{
      if(!active||active.node!==node)return;
      resume.hidden=false;
      status.textContent='SELECT PLAY FORESTFALL TO START THE CINEMATIC';
    });
    skip.focus();
    return true;
  }
  ui.addEventListener('click',event=>{
    if(event.target.closest('[data-forestfall-choose]')){
      ui.querySelector('[data-forestfall-file]')?.click();
    }else if(event.target.closest('[data-forestfall-preview]')){
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