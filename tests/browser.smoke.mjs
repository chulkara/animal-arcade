/* Browser-level Phase 1 smoke tests, run in GitHub Actions with Playwright.
 * Exercises the shipped HTML/CSS/JS and actual approved image, not source text. */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.ARKADE_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const screenshots='test-results';
await mkdir(screenshots,{recursive:true});
const failures=[];

async function run(name,dimensions,steps,options={}){
  const context=await browser.newContext({viewport:dimensions,deviceScaleFactor:1,reducedMotion:options.reducedMotion||'reduce'});
  const page=await context.newPage();
  // Developer tools sit in a DEV drawer (closed by default); tests that use
  // them open it the way a person would, via its toggle.
  page.openDev=async()=>{if(await page.locator('.combat-footer[data-dev-open="false"]').count())await page.locator('[data-dev-toggle]').click();};
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  try {
    const response=await page.goto(base,{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200,'game must serve HTTP 200');
    await page.locator('#painted-stage').waitFor({state:'visible',timeout:45000});
    await page.waitForFunction(()=>document.querySelector('.painted-art')?.naturalWidth===1672,{timeout:15000});
    assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
    const image=await page.locator('.painted-art').evaluate(el=>({
      width:el.naturalWidth,height:el.naturalHeight,objectFit:getComputedStyle(el).objectFit,
      src:el.currentSrc
    }));
    assert.equal(image.width,1672);
    assert.equal(image.height,941);
    assert.equal(image.objectFit,'contain');
    assert.ok(image.src.startsWith('blob:')||image.src.includes('approved-menu.png'));
    await steps(page);
    assert.deepEqual(errors,[],'there must be no uncaught JavaScript errors');
    console.log('PASS',name);
  }catch(error){
    failures.push({name,error:String(error)});
    console.error('FAIL',name,error);
  }finally{
    await page.screenshot({path:`${screenshots}/${name}.png`,fullPage:true}).catch(()=>{});
    await context.close();
  }
}

await run('desktop-1440x900',{width:1440,height:900},async page=>{
  const menu=page.locator('.painted-hotspots');
  const buttons=menu.locator('button[data-art-action]');
  assert.equal(await buttons.count(),5);
  await menu.locator('[data-art-action="PLAY"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MODE_MENU');
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'ANIMAL_SELECT');
  assert.match(await page.locator('.prototype-note').innerText(),/Active roster: Bear and Moose/);
  await page.locator('[data-prototype-mode]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MODE_MENU');
  await page.locator('[data-back]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
  await menu.locator('[data-art-action="BINDER"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BINDER');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
  await menu.locator('[data-art-action="SHOP"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'SHOP_PREVIEW');
  await page.keyboard.press('Escape');
  await menu.locator('[data-art-action="MY_CARDS"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'CARDS');
  await page.keyboard.press('Escape');
  await menu.locator('[data-art-action="SETTINGS"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'OPTIONS');
  await page.locator('#setting-master').evaluate(el=>{el.value='43';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#setting-master').inputValue(),'43');
  await page.keyboard.press('Escape');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#painted-stage').waitFor({state:'visible',timeout:45000});
  await menu.locator('[data-art-action="SETTINGS"]').click();
  assert.equal(await page.locator('#setting-master').inputValue(),'43');
});
await run('tablet-1024x768',{width:1024,height:768},async page=>{
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('.painted-hotspot.active').getAttribute('data-art-action'),'MY_CARDS');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'CARDS');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
});
await run('phone-390x844',{width:390,height:844},async page=>{
  const dock=page.locator('.painted-mobile-nav');
  assert.equal(await dock.locator('button').count(),5);
  assert.equal(await dock.evaluate(el=>getComputedStyle(el).display),'flex');
  await dock.locator('[data-art-action="PLAY"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MODE_MENU');
  await page.locator('[data-back]').click();
  await dock.locator('[data-art-action="SETTINGS"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'OPTIONS');
  assert.ok(await page.locator('[data-back]').isVisible());
});
await run('landscape-844x390',{width:844,height:390},async page=>{
  const play=page.locator('.painted-hotspot[data-art-action="PLAY"]');
  assert.ok(await play.isVisible());
  await play.click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MODE_MENU');
  assert.ok(await page.locator('[data-mode="SOLO_SELECT"]').isVisible());
  await page.locator('[data-back]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
});

await run('solo-prototype-1440x900',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'ANIMAL_SELECT');
  assert.equal(await page.locator('[data-animal]').count(),2);
  await page.locator('[data-animal="bear"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_STAGE');
  assert.match(await page.locator('.arena').innerText(),/BROWN BEAR/);
  assert.match(await page.locator('.arena').innerText(),/MOUNTAIN MOOSE/);
  assert.match(await page.locator('.prototype-note').innerText(),/Exact historical damage formulas/);
  await page.locator('[data-prototype-intro]').click();
  assert.match(await page.locator('.prototype-announcer').innerText(),/STAGE IS SET/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'ANIMAL_SELECT');
  await page.locator('[data-prototype-mode]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MODE_MENU');
  await page.locator('[data-back]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
});
await run('duel-prototype-390x844',{width:390,height:844},async page=>{
  await page.locator('.painted-mobile-nav [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="DUEL_SELECT"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'ANIMAL_SELECT');
  assert.match(await page.locator('.prototype-status').innerText(),/PLAYER 1 SELECTS/);
  await page.locator('[data-animal="moose"]').click();
  assert.match(await page.locator('.prototype-status').innerText(),/PLAYER 2 SELECTS/);
  await page.locator('[data-animal="bear"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_STAGE');
  assert.match(await page.locator('.arena').innerText(),/PLAYER 2/);
  await page.locator('[data-prototype-menu]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
  assert.equal(await page.locator('.painted-art').evaluate(el=>el.naturalWidth),1672);
});


await run('combat-solo-1440x900',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal(await page.locator('[data-tiger-lab-toggle]').count(),0,'Paused Tiger lab stays hidden');
  assert.deepEqual(await page.locator('[data-animal-id]').evaluateAll(
    nodes=>nodes.map(node=>node.dataset.animalId)),['bear','moose']);
  assert.ok(await page.evaluate(()=>typeof window.NoahsRoster?.motionFor==='function'));
  assert.equal(await page.locator('.combat-hp').count(),2);
  assert.match(await page.locator('.combat-reel-label').innerText(),/SET YOUR ATTACK!/);
  await page.keyboard.press('g');
  assert.match(await page.locator('.combat-reel-label').innerText(),/^ATTACK!$/);
  for(let turn=0;turn<15;turn++){
    const controls=await page.locator('[data-combat-stop]').count();
    if(!controls)break;
    await page.keyboard.press('y');
  }
  assert.ok(await page.locator('[data-combat-next], [data-combat-next-bout], [data-combat-rematch]').count()>0,'Solo slot should settle to a result');
  const hp=await page.locator('.combat-hp').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('aria-valuenow'))));
  assert.ok(hp.some(n=>n<180),'An animal must take real damage');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_STAGE');
  assert.ok(await page.locator('[data-prototype-fight]').count()>0);
  assert.equal(await page.locator('.painted-art').evaluate(el=>el.naturalWidth),1672);
});
await run('combat-duel-390x844',{width:390,height:844},async page=>{
  await page.locator('.painted-mobile-nav [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="DUEL_SELECT"]').click();
  await page.locator('[data-animal="moose"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  // Both reels spin at once; each player has one button. P1 locks first:
  // P1's reel hides behind a LOCKED shutter until P2 locks, then both reveal.
  assert.equal(await page.locator('[data-reel-player]').count(),2,'both attack reels spin together');
  await page.keyboard.press('g');
  assert.match(await page.locator('.combat-reel-label').innerText(),/SET YOUR ATTACK!/);
  assert.equal(await page.locator('[data-reel-player="0"].is-shuttered').count(),1,'P1 pick is masked');
  await page.keyboard.press('j');
  assert.match(await page.locator('.combat-reel-label').innerText(),/^ATTACK!$/);
  assert.equal(await page.locator('[data-reel-player]').count(),2,'both number reels spin together');
  await page.keyboard.press('j');
  assert.equal(await page.locator('[data-reel-player="1"].is-shuttered').count(),1,'P2 pick is masked');
  await page.keyboard.press('y');
  for(let turn=0;turn<15;turn++){
    if(!await page.locator('[data-combat-stop]').count())break;
    await page.keyboard.press('y');await page.keyboard.press('j');
  }
  assert.ok(await page.locator('[data-combat-next], [data-combat-next-bout], [data-combat-rematch]').count()>0);
  // BACK TO ARENA lives in the DEV drawer now; the drawer closes after use
  await page.openDev();await page.locator('[data-combat-quit]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_STAGE');
});


await run('card-collection-desktop-1440x900',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="MY_CARDS"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'CARDS');
  assert.equal(await page.locator('.ark-card-tile').count(),12);
  assert.equal(await page.locator('.ark-unlocked').count(),6);
  assert.match(await page.locator('.ark-card-local-note').innerText(),/not synced online/);
  await page.locator('[data-card-filter="miracle"]').click();
  assert.equal(await page.locator('.ark-card-tile').count(),5);
  await page.locator('[data-card-nav="BINDER"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BINDER');
  assert.equal(await page.locator('.ark-deck-slot').count(),3);
  await page.locator('[data-card-equip="strong:guard"]').click();
  assert.match(await page.locator('.ark-deck-slot').nth(1).innerText(),/OAKEN GUARD/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#painted-stage').waitFor({state:'visible',timeout:45000});
  await page.locator('.painted-hotspots [data-art-action="BINDER"]').click();
  assert.match(await page.locator('.ark-deck-slot').nth(1).innerText(),/OAKEN GUARD/);
  await page.locator('[data-card-side="p2"]').click();
  assert.match(await page.locator('.ark-deck-slot').nth(1).innerText(),/OAKEN GUARD/);
  await page.locator('[data-card-equip="strong:fang"]').click();
  assert.match(await page.locator('.ark-deck-slot').nth(1).innerText(),/FANG STANDARD/);
  await page.locator('[data-card-side="p1"]').click();
  assert.match(await page.locator('.ark-deck-slot').nth(1).innerText(),/OAKEN GUARD/);
  await page.locator('[data-card-backup-toggle]').click();
  assert.ok((await page.locator('[data-card-export-text]').inputValue()).includes('strong:guard'));
  await page.locator('[data-card-import-text]').fill('invalid JSON');
  await page.locator('[data-card-import]').click();
  assert.match(await page.locator('.ark-card-notice').innerText(),/INVALID BACKUP/);
});
await run('binder-mobile-390x844',{width:390,height:844},async page=>{
  await page.locator('.painted-mobile-nav [data-art-action="BINDER"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BINDER');
  assert.equal(await page.locator('.ark-deck-slot').count(),3);
  await page.locator('[data-card-side="p2"]').click();
  await page.locator('[data-card-equip="miracle:meteor"]').click();
  assert.match(await page.locator('.ark-deck-slot').nth(2).innerText(),/FALLING STAR/);
  await page.locator('.ark-collection-panel').evaluate(el=>{el.scrollTop=0;});
  await page.screenshot({path:`${screenshots}/binder-phone-top-390x844.png`});
  const scroll=await page.locator('.ark-collection-panel').evaluate(el=>{
    const max=el.scrollHeight-el.clientHeight;el.scrollTop=max;
    return {max,position:el.scrollTop};
  });
  assert.ok(scroll.max>0&&scroll.position>0,'The binder must scroll to its lower cards on mobile');
  await page.screenshot({path:`${screenshots}/binder-phone-bottom-390x844.png`});
  await page.locator('[data-card-back]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
  await page.locator('.painted-mobile-nav [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="BINDER"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BINDER');
  await page.locator('[data-card-back]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MODE_MENU');
});
await run('card-reward-solo-1440x900',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  const result=await page.evaluate(()=>{
    let steps=0;
    while(steps++<250){
      const s=window.NoahsCombat.getState();
      if(s.phase==='FINISHED'){
        if(s.session.complete)break;
        window.NoahsCombat.nextBout();
        continue;
      }
      if(s.phase==='RESULT')window.NoahsCombat.next();
      else window.NoahsCombat.stopSlot();
    }
    return {phase:window.NoahsCombat.getState().phase,
      wins:window.NoahsCards.store.getState().wins};
  });
  assert.equal(result.phase,'FINISHED');
  assert.equal(result.wins,1);
  assert.match(await page.locator('.combat-card-reward').innerText(),/MATCH REWARD/);
  assert.equal(await page.locator('.combat-card-reward').count(),1);
  await page.locator('[data-combat-view-cards]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'CARDS');
  assert.equal(await page.locator('.ark-unlocked').count(),7);
  assert.match(await page.locator('.ark-collection-summary').innerText(),/7/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#painted-stage').waitFor({state:'visible',timeout:45000});
  await page.locator('.painted-hotspots [data-art-action="MY_CARDS"]').click();
  assert.equal(await page.locator('.ark-unlocked').count(),7);
});


await run('forestfall-preview-while-reels-spin',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal((await page.evaluate(()=>window.NoahsCombat.getState().phase)),'ATTACK');
  await page.openDev();
  assert.equal(await page.locator('[data-forestfall-preview]').isDisabled(),true);
  // This tiny artificial file only tests the UI path; the user's original
  // generated video never enters the repo or the test service.
  await page.locator('[data-forestfall-file]').setInputFiles({
    name:'forestfall-smoke.mp4',mimeType:'video/mp4',
    buffer:Buffer.from('placeholder bytes for browser UI smoke test')
  });
  assert.equal(await page.locator('[data-forestfall-preview]').isDisabled(),false);
  assert.match(await page.locator('[data-forestfall-status]').innerText(),/FORESTFALL READY/);
  await page.openDev();await page.locator('[data-forestfall-preview]').click();
  await page.locator('.ark-forestfall').waitFor({state:'visible',timeout:3000});
  assert.match(await page.locator('.ark-forestfall-status').innerText(),/NO DAMAGE/);
  assert.equal(await page.locator('.ark-forestfall-target-art').count(),1,
    'Preview must show the actual opponent so cinematic impact can be reviewed');
  await page.locator('.ark-forestfall video').evaluate(video=>{
    Object.defineProperty(video,'duration',{configurable:true,get:()=>14.93});
    Object.defineProperty(video,'currentTime',{configurable:true,get:()=>11.95});
    video.dispatchEvent(new Event('timeupdate'));
  });
  await page.locator('.ark-forestfall-reaction').waitFor({state:'visible'});
  assert.match(await page.locator('.ark-forestfall-hit-damage').textContent(),
    /PREVIEW · NO HP CHANGE/);
  assert.equal((await page.evaluate(()=>window.NoahsCombat.getState().phase)),'ATTACK',
    'Viewing Forestfall must never stop the reel or change scored gameplay');
  await page.locator('.ark-forestfall-controls button').last().click();
  assert.equal(await page.locator('.ark-forestfall').count(),0);
  await page.keyboard.press('g');
  assert.equal((await page.evaluate(()=>window.NoahsCombat.getState().phase)),'POWER');
  assert.equal(await page.locator('[data-forestfall-preview]').isDisabled(),false,
    'File stays selected across battle-screen rerenders');
  await page.openDev();await page.locator('[data-forestfall-preview]').click();
  assert.equal(await page.locator('.ark-forestfall').count(),1,
    'Preview must also open from the POWER reel, not silently do nothing');
  await page.locator('.ark-forestfall-controls button').last().click();
  assert.equal((await page.evaluate(()=>window.NoahsCombat.getState().phase)),'POWER');
});

await run('forestfall-scored-special-hit-bridge',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  await page.locator('[data-forestfall-file]').setInputFiles({
    name:'forestfall-impact-test.mp4',mimeType:'video/mp4',
    buffer:Buffer.from('dummy video for cinematic event wiring only')
  });
  const baseline=await page.evaluate(()=>{
    const s=window.NoahsCombat.getState();
    return {phase:s.phase,bearHp:s.animals[0].hp,mooseHp:s.animals[1].hp};
  });
  assert.equal(baseline.phase,'ATTACK');
  const testData=await page.evaluate(()=>{
    const api=window.NoahsCombat;
    const original=api.getState;
    const current=original();
    const attacker=current.animals.findIndex(a=>a.id==='bear');
    const defender=1-attacker;
    const maxHp=current.animals[defender].maxHp;
    const prior=current.animals[defender].hp;
    const damage=Math.min(prior,37);
    const remainingHp=prior-damage;
    const fake={...current,phase:'RESULT',round:401,
      lastEvent:{kind:'HIT',attacker,defender,damage,remainingHp,
        technique:'P',special:true,miracleBonus:0,miracleName:null}};
    api.getState=()=>fake;
    window.dispatchEvent(new CustomEvent('arkade:reelstop',{
      detail:{phase:'POWER',value:'MARK',hit:true}}));
    api.getState=original;
    return {defenderId:current.animals[defender].id,damage,remainingHp,maxHp};
  });
  assert.equal(await page.locator('.ark-forestfall').count(),1,
    'A real Bear special HIT event should open a fullscreen cutscene');
  assert.equal(await page.locator('.ark-forestfall-reaction img').count(),1,
    'The reaction inset identifies the real defender, not a generic enemy');
  assert.ok((await page.locator('.ark-forestfall-target-art').getAttribute('src'))
    .includes(testData.defenderId));
  await page.locator('.ark-forestfall video').evaluate(video=>{
    Object.defineProperty(video,'duration',{configurable:true,get:()=>14.93});
    Object.defineProperty(video,'currentTime',{configurable:true,get:()=>11.95});
    video.dispatchEvent(new Event('timeupdate'));
  });
  await page.locator('.ark-forestfall-reaction').waitFor({state:'visible',timeout:3000});
  assert.match(await page.locator('.ark-forestfall-hit-damage').textContent(),
    new RegExp(String(testData.damage)));
  assert.match(await page.locator('.ark-forestfall-target-copy small').textContent(),
    new RegExp(String(testData.remainingHp)));
  const after=await page.evaluate(()=>{
    const s=window.NoahsCombat.getState();
    return {phase:s.phase,bearHp:s.animals[0].hp,mooseHp:s.animals[1].hp};
  });
  assert.deepEqual(after,baseline,'Video collision must never change real HP or reel phase');
  await page.locator('.ark-forestfall-controls button').last().click();
  assert.equal(await page.locator('.ark-forestfall').count(),0);
  assert.equal(await page.locator('#game').getAttribute('inert'),null,
    'Battle controls must unlock after the cinematic ends');
}, {reducedMotion:'reduce'});

await run('forestfall-video-to-native-fbx-match-cut',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  await page.evaluate(()=>{
    // The CI repo intentionally has no licensed private FBX files.
    // This mock verifies the actual film->WebGL bridge and lifecycle.
    // Native skeleton/clip fidelity still needs the owner's local test.
    window.__forestfallSpy={updates:[],stopped:0,started:0};
    const original=window.NoahsArena3D;
    window.NoahsArena3D={...original,
      createForestfallCollision({host,event}){
        window.__forestfallSpy.started++;
        if(event.attackerId!=='bear'||event.defenderId!=='moose')return null;
        const canvas=document.createElement('canvas');
        canvas.dataset.forestfallFbx='mock';
        host.append(canvas);
        return {
          mode:'native-bear-moose-fbx',
          update(time,duration){
            if(window.__forestfallSpy.failOnUpdate)
              throw Error('mock WebGL context lost');
            window.__forestfallSpy.updates.push({time,duration});
            return true;
          },
          stop(){
            window.__forestfallSpy.stopped++;
            canvas.remove();
          }
        };
      }
    };
  });
  await page.locator('[data-forestfall-file]').setInputFiles({
    name:'source-timing-test.mp4',mimeType:'video/mp4',
    buffer:Buffer.from('fixture; no third-party video checked into CI')
  });
  const prior=await page.evaluate(()=>window.NoahsCombat.getState().animals.map(a=>a.hp));
  await page.openDev();await page.locator('[data-forestfall-preview]').click();
  assert.equal(await page.locator('.ark-forestfall').getAttribute('data-collision'),'native-fbx');
  const seek=async seconds=>page.locator('.ark-forestfall video').evaluate((video,sec)=>{
    Object.defineProperty(video,'duration',{configurable:true,get:()=>14.93});
    Object.defineProperty(video,'currentTime',{configurable:true,get:()=>sec});
    video.dispatchEvent(new Event('timeupdate'));
  },seconds);
  await seek(11.3);
  assert.equal(await page.locator('.ark-forestfall-3d-live').count(),0);
  await seek(11.62);
  assert.equal(await page.locator('.ark-forestfall-3d-live').count(),1);
  assert.ok(await page.locator('.ark-forestfall-native-stage canvas').count()>0);
  await seek(11.96);
  assert.equal(await page.locator('.ark-forestfall-reaction-visible').count(),0,
    'Once both source rigs are present, no cardboard opponent insert should appear');
  assert.match(await page.locator('.ark-forestfall-result').textContent(),
    /PREVIEW · NO HP CHANGE/);
  await seek(13.35);
  assert.equal(await page.locator('.ark-forestfall-3d-live').count(),0,
    'The 3D match cut should hand back to the Bear video for its final roar');
  const test=await page.evaluate(()=>window.__forestfallSpy);
  assert.equal(test.started,1);
  assert.ok(test.updates.length>=2);
  await page.locator('.ark-forestfall-controls button').last().click();
  assert.equal(await page.locator('.ark-forestfall').count(),0);
  assert.equal((await page.evaluate(()=>window.__forestfallSpy)).stopped,1,
    'Skip must dispose the temporary skinned scene/canvas');
  assert.deepEqual(await page.evaluate(()=>window.NoahsCombat.getState().animals.map(a=>a.hp)),
    prior,'A live 3D preview cannot apply or recalculate damage');
  await page.evaluate(()=>{window.__forestfallSpy.failOnUpdate=true;});
  await page.openDev();await page.locator('[data-forestfall-preview]').click();
  await seek(11.7);
  assert.equal(await page.locator('.ark-forestfall').getAttribute('data-collision'),
    'video-fallback','WebGL failure should return to original video rather than strand the match');
  assert.match(await page.locator('.ark-forestfall-status').textContent(),/3D CONTACT UNAVAILABLE/);
  await seek(11.95);
  assert.equal(await page.locator('.ark-forestfall-reaction-visible').count(),1,
    'After WebGL failure, the optional illustrated hit fallback remains available');
  await page.locator('.ark-forestfall-controls button').last().click();
  assert.equal((await page.evaluate(()=>window.__forestfallSpy)).stopped,2,
    'Temporary WebGL clones must dispose both on Skip and renderer failure');
  assert.deepEqual(await page.evaluate(()=>window.NoahsCombat.getState().animals.map(a=>a.hp)),
    prior,'Renderer loss cannot alter the live scored HP');
}, {reducedMotion:'reduce'});

await run('battle-feel-desktop-1440x900',{width:1440,height:900},async page=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal(await page.locator('.combat-battlefield').count(),1);
  assert.equal(await page.locator('.battlefield-ridge').count(),2);
  assert.equal(await page.locator('.combat-reel-neighbor').count(),2);
  const first=await page.locator('[data-reel-current]').innerText();
  // A three-symbol reel may randomly return to its initial symbol after
  // 155ms. Poll continuously for an actual transition rather than making
  // a probabilistic equality comparison at only two timestamps.
  await page.waitForFunction(initial=>{
    const el=document.querySelector('[data-reel-current]');
    return Boolean(el)&&el.textContent.trim()!==initial;
  },first,{timeout:3000});
  await page.keyboard.press('g');
  assert.equal(await page.locator('.combat-reel').getAttribute('data-reel-type'),'POWER');
  assert.match(await page.locator('.combat-reel-label').innerText(),/^ATTACK!$/);
  for(let i=0;i<20;i++){
    if(!await page.locator('[data-combat-stop]').count())break;
    await page.keyboard.press('y');
  }
  assert.ok(await page.locator('[data-combat-next], [data-combat-next-bout], [data-combat-rematch]').count()>0);
  assert.equal(await page.locator('.combat-battlefield.battlefield-impact').count(),1);
  assert.equal(await page.locator('.battlefield-damage').count(),1);
  if(await page.locator('[data-combat-next]').count()){
    // Health holds at its pre-hit value through the clash and the film and
    // drains only when the victim lands; no pill / STRIKE LANDS over it.
    const held=await page.evaluate(()=>{const r=document.querySelector('.ark-reference-layout'),
      v=r.querySelector('.ark-hud-health-value.is-struck');
      return {hold:r.dataset.hpHold,before:v&&getComputedStyle(v.querySelector('.hp-before')).display!=='none',
        after:v&&getComputedStyle(v.querySelector('.hp-after')).display!=='none'};});
    assert.equal(held.hold,'1','HP is held during the clash');
    assert.ok(held.before&&!held.after,'pre-hit number shown until the landing');
    assert.equal(await page.locator('.combat-series').isVisible(),false,'no expedition pill over the hit');
    assert.equal(await page.locator('.combat-reel-label').evaluate(el=>getComputedStyle(el).visibility),'hidden','no THE STRIKE LANDS before the strike');
    await page.waitForFunction(()=>!document.querySelector('.ark-reference-layout')?.dataset.hpHold,null,{timeout:15000});
    assert.equal(await page.locator('.ark-hud-health-value.is-struck .hp-after').evaluate(el=>getComputedStyle(el).display!=='none'),true,'drained after the landing');
    assert.equal(await page.locator('.ark-reference-layout[data-film-past="1"] .fight-deck').evaluate(el=>getComputedStyle(el).opacity),'0','bottom HUD stays away until the next turn');
  }
  const an=await page.locator('.combat-striker .combat-fighter-art')
    .evaluate(el=>getComputedStyle(el).animationName);
  assert.notEqual(an,'none','The original animal portrait should animate on attack');
  assert.equal(await page.locator('.ark-cinema').count(),1,'The new cinematic stage should be mounted');
  assert.ok(['focus','title','intro','attack','contact','launch','impact','reaction','miracle','victory','done']
    .includes(await page.locator('.ark-cinema').getAttribute('data-beat')));
  // the move summary is not drawn over a filmed hit (the film names the
  // move) but stays in the page as a status for screen readers
  await page.locator('.combat-message').waitFor({state:'attached',timeout:8000});
  assert.match(await page.locator('.combat-message').textContent(),/FERAL CHARGE|LOW SWIPE|HIGH PAW STRIKE|RAGING REAR|ANTLER CHARGE|CROSS-ANTLER SWEEP|TWO-HOOF STOMP|LEAPING ANTLER DRIVE/);
  await page.evaluate(()=>window.NoahsCinematics.sync());
  assert.equal(await page.locator('.combat-battlefield .ark-cinema').count(),1,
    'Repeated director sync must not leave ghost move titles');
  await page.evaluate(()=>{
    if(window.NoahsCombat.getState().phase==='FINISHED')window.NoahsCombat.rematch();
    else window.NoahsCombat.next();
    window.NoahsCinematics.sync();
  });
  assert.equal(await page.locator('.combat-battlefield .ark-cinema').count(),0,
    'Returning to reels must remove the previous cinematic title DOM');
}, {reducedMotion:'no-preference'});
await run('battle-feel-reduced-motion-390x844',{width:390,height:844},async page=>{
  await page.locator('.painted-mobile-nav [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="DUEL_SELECT"]').click();
  await page.locator('[data-animal="moose"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('.combat-battlefield').count(),1);
  assert.ok(await page.locator('[data-combat-stop]').isVisible());
  await page.keyboard.press('g');
  await page.keyboard.press('j');
  await page.keyboard.press('y');
  await page.keyboard.press('j');
  for(let i=0;i<20;i++){
    if(!await page.locator('[data-combat-stop]').count())break;
    await page.keyboard.press('y');await page.keyboard.press('j');
  }
  assert.ok(await page.locator('[data-combat-next], [data-combat-next-bout], [data-combat-rematch]').count()>0);
  const anim=await page.locator('.combat-striker .combat-fighter-art')
    .evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(anim,'none','System reduced motion must turn off attack lunges');
  const frame=await page.locator('.combat-panel').boundingBox();
  assert.ok(frame.width<=390,'Combat panel must fit mobile viewport');
});


await run('arcade-run-mode-1440x900',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.match(await page.locator('.combat-series').innerText(),/EXPEDITION WINS/);
  assert.match(await page.locator('.combat-heading').innerText(),/BOUT 1 \/ 3/);
  assert.equal(await page.locator('.combat-card-reward').count(),0,'Rewards cannot be granted on entry');
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
});
await run('versus-set-mode-390x844',{width:390,height:844},async page=>{
  await page.locator('.painted-mobile-nav [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="DUEL_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-animal="moose"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.match(await page.locator('.combat-heading').innerText(),/BOUT 1 · FIRST TO 2/);
  assert.match(await page.locator('.combat-series').innerText(),/PLAYER 2 WINS/);
  assert.equal(await page.locator('.combat-card-reward').count(),0);
});


await run('reference-arena-layout-desktop',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal(await page.locator('.ark-arena-hud-player').count(),2);
  assert.equal(await page.locator('.ark-reel-opponent').count(),1);
  const metrics=await page.evaluate(()=>{
    const rect=x=>{const r=document.querySelector(x).getBoundingClientRect();
      return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    return {panel:rect('.ark-reference-layout'),stage:rect('.combat-battlefield'),
      hud:rect('.ark-arena-hud'),dock:rect('.combat-controls'),
      stop:rect('.combat-stop'),buttons:document.querySelectorAll('[data-combat-stop]').length};
  });
  assert.ok(metrics.panel.w>=1438,'Battle view must occupy game width, not a 1000px card');
  assert.ok(metrics.stage.h>=890,'Stage should fill game vertically');
  assert.ok(metrics.hud.y<10,'Health/status must be at the very top');
  assert.ok(metrics.dock.bottom<=901&&metrics.dock.bottom>=890,'Reels should dock to bottom');
  assert.ok(metrics.stop.w>=70,'Primary input must be arcade-sized');
  assert.equal(metrics.buttons,1);
  const art=await page.locator('.combat-fighter-art').evaluateAll(nodes=>nodes.map(el=>el.naturalWidth));
  assert.ok(art.length===2&&art.every(n=>n>0),'Both original temporary animal portraits must load');
});
await run('reference-arena-layout-landscape',{width:844,height:390},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="DUEL_SELECT"]').click();
  await page.locator('[data-animal="moose"]').click();
  await page.locator('[data-animal="bear"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  const frame=await page.evaluate(()=>{
    const selectors=['.ark-reference-layout','.combat-controls','.ark-arena-hud'];
    return selectors.map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();
      return {sel,x:r.x,y:r.y,w:r.width,bottom:r.bottom};});
  });
  assert.ok(frame.every(x=>x.x>=-1&&x.w<=846&&x.bottom<=391),
    'HUD and controls must fit within small landscape viewport');
  assert.ok(await page.locator('[data-combat-stop]').isVisible(),'Touch reel stop must be reachable');
  await page.keyboard.press('g');
  assert.equal(await page.locator('[data-reel-player="1"]').getAttribute('data-reel-type'),'ATTACK',
    'Local player two keeps their own attack reel after player one locks');
  assert.equal(await page.locator('[data-reel-player="0"].is-shuttered').count(),1);
});

await run('private-3d-dialog-mobile-390x844',{width:390,height:844},async page=>{
  await page.locator('.painted-mobile-nav [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="moose"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal(await page.locator('.combat-footer').getAttribute('data-dev-open'),'false','dev tools start tucked away');
  assert.equal(await page.locator('[data-ark3d-open]').isVisible(),false);
  await page.openDev();
  assert.ok(await page.locator('[data-ark3d-open]').isVisible());
  assert.ok(await page.locator('[data-bear-review-quick]').isVisible(),
    'Bear review must be discoverable directly from the battle footer');
  await page.locator('[data-bear-review-quick]').click();
  assert.equal(await page.locator('.ark-fbx-dialog').count(),1,
    'Quick launch without Bear assets must open the setup panel');
  assert.match(await page.locator('[data-ark3d-status]').innerText(),/Load Brown Bear Motion Lab V2 files first/);
  const location=await page.locator('.ark-fbx-dialog').evaluate(el=>{
    const button=el.querySelector('[data-bear-review-start]');
    const firstImporter=el.querySelector('[data-ark3d-species="bear"]');
    return {buttonTop:button.getBoundingClientRect().top,
      importerTop:firstImporter.getBoundingClientRect().top,
      panelBottom:el.getBoundingClientRect().bottom,
      visible:button.getBoundingClientRect().bottom<=el.getBoundingClientRect().bottom};
  });
  assert.ok(location.buttonTop<location.importerTop,'Bear review launch must appear before the import forms');
  assert.ok(location.visible,'Bear review launch must be within the initial modal viewport');
  await page.locator('[data-ark3d-close]').click();
  const status=await page.evaluate(()=>window.NoahsArena3D.getStatus());
  assert.equal(status.bear,false);
  assert.equal(status.moose,false);
  assert.equal(await page.locator('.combat-footer').getAttribute('data-dev-open'),'false','the DEV drawer closes itself once a tool is used');
  await page.openDev();await page.locator('[data-ark3d-open]').click();
  assert.equal(await page.locator('.ark-fbx-dialog').count(),1);
  assert.equal(await page.locator('[data-ark3d-folder]').count(),2);
  assert.equal(await page.locator('[data-bear-review-start]').count(),1);
  const beforeReview=await page.evaluate(()=>JSON.stringify(window.NoahsCombat.getState()));
  await page.locator('[data-bear-review-start]').click();
  assert.match(await page.locator('[data-ark3d-status]').innerText(),/Load the Brown Bear Motion Lab V2/);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.NoahsCombat.getState())),beforeReview,
    'An unavailable private model must never change battle HP or selections');
  assert.equal(await page.locator('.ark-bear-review-toolbar').count(),0);
  await page.locator('[data-ark3d-load="moose"]').click();
  assert.match(await page.locator('[data-ark3d-status]').innerText(),/Choose an extracted moose folder/);
  await page.locator('[data-ark3d-close]').click();
  assert.equal(await page.locator('.ark-fbx-dialog').count(),0);
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  await page.keyboard.press('g');
  assert.equal(await page.locator('.combat-reel').getAttribute('data-reel-type'),'POWER');
  assert.equal(await page.locator('.combat-fighter-art').count(),2);
});

await browser.close();
if(failures.length) {
  console.error(JSON.stringify(failures,null,2));
  process.exitCode=1;
}
