/* Tiny original synthesizer. Audio is unlocked only by a player gesture. */
(function () {
  'use strict';
  let ctx=null, drone=null, droneGain=null, musicSetting=0;
  let settings={master:.65,music:.28,sfx:.75,mute:false};
  function unlock(){
    if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ctx=new C();}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    ensureMusic();
  }
  function effective(volume){return settings.mute?0:settings.master*volume;}
  function ensureMusic(){
    if(!ctx||drone)return;
    droneGain=ctx.createGain();droneGain.gain.value=0;droneGain.connect(ctx.destination);
    drone=[110,164.81,220].map((freq,index)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type=index===1?'sine':'triangle';o.frequency.value=freq;g.gain.value=[.27,.10,.12][index];
      o.connect(g);g.connect(droneGain);o.start();return {o,g};
    });
    setMusicVolume();
  }
  function setMusicVolume(){
    if(!ctx||!droneGain)return;
    const now=ctx.currentTime;
    droneGain.gain.cancelScheduledValues(now);
    droneGain.gain.setTargetAtTime(musicSetting?effective(settings.music)*.095:0,now,.12);
  }
  function update(next){settings={...settings,...next}; setMusicVolume();}
  function setMusic(active){musicSetting=active?1:0;setMusicVolume();}
  function tone(frequency,duration,type='triangle',gain=.18,delay=0){
    if(!ctx||effective(settings.sfx)<=0)return;
    const now=ctx.currentTime+delay;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(frequency,now);
    o.frequency.exponentialRampToValueAtTime(frequency*.97,now+duration);
    g.gain.setValueAtTime(.00001,now);
    g.gain.exponentialRampToValueAtTime(Math.max(.00001,effective(settings.sfx)*gain),now+.012);
    g.gain.exponentialRampToValueAtTime(.00001,now+duration);
    o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+duration+.018);
  }
  function cue(name){
    if(!ctx)return;
    switch(name){
      case 'move': tone(480,.065,'sine',.14);break;
      case 'back': tone(310,.12,'triangle',.14);tone(220,.16,'sine',.10,.04);break;
      case 'confirm': tone(420,.15,'triangle',.17);tone(640,.22,'sine',.13,.07);tone(820,.34,'sine',.1,.15);break;
      case 'reveal': tone(261.6,.6,'triangle',.07);tone(392,.52,'sine',.055,.08);tone(523.2,.55,'sine',.05,.18);break;
    }
  }
  function destroy(){
    drone?.forEach(d=>{try{d.o.stop();}catch{}});drone=null;
    ctx?.close();ctx=null;
  }
  window.NoahsAudio={unlock,update,setMusic,cue,destroy};
})();