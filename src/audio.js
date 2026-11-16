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
  function burst(duration=.14,gain=.14,filterHz=800,delay=0){
    if(!ctx||effective(settings.sfx)<=0)return;
    const size=Math.max(256,Math.ceil(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,size,ctx.sampleRate),samples=buffer.getChannelData(0);
    let seed=0x4c415241;
    for(let i=0;i<size;i++){
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      samples[i]=((seed>>>0)/2147483648-1)*Math.pow(1-i/size,2);
    }
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),vol=ctx.createGain();
    src.buffer=buffer;filter.type='lowpass';filter.frequency.value=filterHz;
    const at=ctx.currentTime+delay;
    vol.gain.setValueAtTime(Math.max(.00001,effective(settings.sfx)*gain),at);
    vol.gain.exponentialRampToValueAtTime(.00001,at+duration);
    src.connect(filter);filter.connect(vol);vol.connect(ctx.destination);
    src.start(at);src.stop(at+duration+.01);
  }
  function cue(name){
    if(!ctx)return;
    switch(name){
      case 'move': tone(480,.065,'sine',.14);break;
      case 'back': tone(310,.12,'triangle',.14);tone(220,.16,'sine',.10,.04);break;
      case 'confirm': tone(420,.15,'triangle',.17);tone(640,.22,'sine',.13,.07);tone(820,.34,'sine',.1,.15);break;
      case 'reveal': tone(261.6,.6,'triangle',.07);tone(392,.52,'sine',.055,.08);tone(523.2,.55,'sine',.05,.18);break;
      // Original, short synthesizer cues for the Phase 4.5 combat slice.
      // Audio still respects master/SFX/mute and starts only after a gesture.
      case 'slot':
        tone(580,.065,'square',.085);tone(870,.095,'sine',.07,.045);break;
      case 'reelTick':
        tone(290,.038,'square',.028);break;
      case 'arcadeStop':
        burst(.11,.16,3700);
        tone(620,.10,'square',.13);tone(990,.19,'sine',.09,.065);
        tone(1450,.26,'triangle',.045,.12);break;
      case 'cinemaIntro':
        burst(.2,.10,1100);tone(235,.22,'sawtooth',.14);
        tone(370,.38,'triangle',.08,.12);break;
      case 'cinemaFocus':
        // The tension rises from a low rumble into a short harmonic swell.
        tone(123,.44,'sawtooth',.09);
        tone(185,.36,'triangle',.08,.08);
        tone(247,.31,'sine',.09,.17);burst(.17,.06,420,.09);break;
      case 'cinemaWin':
        // Original four-note winner resolution, not arcade sampled audio.
        tone(293.66,.32,'triangle',.14);
        tone(440,.39,'triangle',.13,.13);
        tone(587.33,.46,'triangle',.12,.28);
        tone(880,.74,'sine',.09,.43);
        burst(.28,.08,3200,.30);break;
      case 'cinemaMiracle':
        tone(330,.22,'sine',.09);tone(495,.30,'triangle',.10,.08);
        tone(660,.38,'sine',.09,.17);tone(990,.44,'sine',.07,.30);
        burst(.27,.085,4800,.26);break;
      case 'cinemaReaction':
        burst(.16,.10,700);tone(158,.27,'triangle',.10,.06);break;
      case 'cinemaVictory':
        tone(261.6,.55,'triangle',.10);
        tone(392,.56,'triangle',.10,.13);
        tone(523.25,.65,'triangle',.10,.30);
        tone(783.99,.77,'sine',.065,.47);break;
      case 'impact':
        burst(.24,.24,1600);tone(125,.24,'sawtooth',.21);
        tone(75,.33,'triangle',.12,.06);tone(53,.42,'triangle',.11,.09);break;
      case 'special':
        tone(380,.26,'triangle',.12);tone(570,.29,'sine',.12,.04);
        tone(860,.34,'sine',.10,.10);tone(125,.25,'sawtooth',.13,.11);break;
      case 'tie':
        tone(520,.11,'square',.10);tone(490,.14,'square',.07,.1);
        tone(610,.17,'sine',.10,.21);break;
      case 'ko':
        tone(175,.35,'triangle',.19);tone(131,.42,'sawtooth',.12,.12);
        tone(262,.5,'sine',.08,.21);break;
    }
  }
  function destroy(){
    drone?.forEach(d=>{try{d.o.stop();}catch{}});drone=null;
    ctx?.close();ctx=null;
  }
  window.NoahsAudio={unlock,update,setMusic,cue,destroy};
})();