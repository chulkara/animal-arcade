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
  // Original layered animal vocal: rough breath noise beneath a falling
  // low register tone. Synthesized locally, with no sampled game audio.
  // One original synthesized vocal, two voices: the Bear's howl and a
  // lower, longer Moose bellow (f0 and formant down, a slower rise).
  function bearHowl(f0=113,duration=1.65,formantHz=440,rise=1.34){
    if(!ctx||effective(settings.sfx)<=0)return;
    const t=ctx.currentTime+.06;
    const out=ctx.createGain();
    out.gain.setValueAtTime(.00001,t);
    out.gain.exponentialRampToValueAtTime(Math.max(.00001,effective(settings.sfx)*.19),t+.23);
    out.gain.setTargetAtTime(Math.max(.00001,effective(settings.sfx)*.14),t+.45,.2);
    out.gain.exponentialRampToValueAtTime(.00001,t+duration);
    out.connect(ctx.destination);
    const formant=ctx.createBiquadFilter();
    formant.type='bandpass';formant.frequency.value=formantHz;formant.Q.value=.75;
    formant.connect(out);
    for(const [f,ratio,type] of [[f0,1,'sawtooth'],[f0*1.044,.40,'triangle'],[f0*1.98,.20,'sawtooth']]){
      const o=ctx.createOscillator(),vol=ctx.createGain();
      o.type=type;o.frequency.setValueAtTime(f,t);
      o.frequency.linearRampToValueAtTime(f*rise,t+.37*duration/1.65);
      o.frequency.linearRampToValueAtTime(f*.70,t+duration);
      vol.gain.value=ratio;
      o.connect(vol);vol.connect(formant);
      o.start(t);o.stop(t+duration+.02);
    }
    const length=Math.ceil(ctx.sampleRate*duration);
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    let seed=0x524f4152;
    for(let i=0;i<length;i++){
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      const phase=i/length;
      const envelope=Math.sin(Math.PI*phase)**.65;
      samples[i]=((seed>>>0)/2147483648-1)*envelope;
    }
    const noise=ctx.createBufferSource(),band=ctx.createBiquadFilter(),vol=ctx.createGain();
    noise.buffer=buffer;band.type='lowpass';band.frequency.value=1250;
    vol.gain.value=.32;
    noise.connect(band);band.connect(vol);vol.connect(out);
    noise.start(t);noise.stop(t+duration);
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
      case 'bearHowl':bearHowl();break;
      case 'mooseBellow':bearHowl(78,1.95,320,1.5);break;
      // Sharks have no voice: a churning water thrash over a low rumble.
      case 'sharkThrash':
        burst(.55,.17,850);burst(.4,.13,2300,.18);burst(.3,.10,1400,.42);
        tone(62,.75,'sawtooth',.07);tone(93,.5,'triangle',.06,.1);break;
      // comeback / ✦ cut-ins (original synth stings)
      case 'goldChange':[523.2,659.3,784,1046.5,1318.5].forEach((f,i)=>tone(f,.32,'triangle',.09,i*.055));tone(2093,.6,'sine',.04,.3);break;
      case 'focus':tone(880,.09,'square',.07);tone(1174.7,.14,'square',.06,.07);break;
      case 'focusGuard':tone(1568,.22,'sine',.08);tone(784,.3,'triangle',.07,.02);break;
      case 'resurrect':[392,493.9,587.3,784].forEach((f,i)=>tone(f,.7-i*.08,'sine',.08,i*.09));tone(196,.9,'triangle',.06);break;
      case 'cinemaRush':
        burst(.29,.15,4200);
        tone(190,.22,'sawtooth',.065);
        tone(110,.29,'triangle',.06,.055);break;
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
      case 'thud':
        // Body hitting the ground: low, short, felt more than heard.
        burst(.22,.20,260);tone(62,.36,'sine',.22);tone(44,.48,'triangle',.14,.03);break;
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