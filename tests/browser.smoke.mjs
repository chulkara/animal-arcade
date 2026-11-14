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
  assert.match(await page.locator('.prototype-note').innerText(),/Prototype roster/);
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
  await page.locator('[data-animal="tiger"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_STAGE');
  assert.match(await page.locator('.arena').innerText(),/BLUE TIGER/);
  assert.match(await page.locator('.arena').innerText(),/GOLDEN LION/);
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
  await page.locator('[data-animal="lion"]').click();
  assert.match(await page.locator('.prototype-status').innerText(),/PLAYER 2 SELECTS/);
  await page.locator('[data-animal="tiger"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_STAGE');
  assert.match(await page.locator('.arena').innerText(),/PLAYER 2/);
  await page.locator('[data-prototype-menu]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
  assert.equal(await page.locator('.painted-art').evaluate(el=>el.naturalWidth),1672);
});


await run('combat-solo-1440x900',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="tiger"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal(await page.locator('[data-tiger-lab-toggle]').count(),1);
  await page.locator('[data-tiger-lab-toggle]').click();
  assert.equal(await page.locator('[data-tiger-hero]').count(),1);
  assert.equal(await page.locator('[data-tiger-run]').count(),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.ark-tiger-lab').count(),0);
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal(await page.locator('.combat-hp').count(),2);
  assert.match(await page.locator('.combat-reel-label').innerText(),/PLAYER 1/);
  await page.keyboard.press('g');
  assert.match(await page.locator('.combat-reel-label').innerText(),/DECIDE WHO STRIKES/);
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
  await page.locator('[data-animal="lion"]').click();
  await page.locator('[data-animal="tiger"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  await page.keyboard.press('g');
  assert.match(await page.locator('.combat-reel-label').innerText(),/PLAYER 2/);
  await page.keyboard.press('g');
  assert.match(await page.locator('.combat-reel-label').innerText(),/PLAYER 1/);
  assert.match(await page.locator('.combat-reel-label').innerText(),/DECIDE WHO STRIKES/);
  await page.keyboard.press('y');
  assert.match(await page.locator('.combat-reel-label').innerText(),/PLAYER 2/);
  await page.keyboard.press('y');
  for(let turn=0;turn<15;turn++){
    if(!await page.locator('[data-combat-stop]').count())break;
    await page.keyboard.press('y');
  }
  assert.ok(await page.locator('[data-combat-next], [data-combat-next-bout], [data-combat-rematch]').count()>0);
  await page.locator('[data-combat-quit]').click();
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
  await page.locator('[data-animal="tiger"]').click();
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


await run('battle-feel-desktop-1440x900',{width:1440,height:900},async page=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="tiger"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BATTLE_PLAY');
  assert.equal(await page.locator('.combat-battlefield').count(),1);
  assert.equal(await page.locator('.battlefield-ridge').count(),2);
  assert.equal(await page.locator('.combat-reel-neighbor').count(),2);
  const first=await page.locator('[data-combat-current]').innerText();
  await page.waitForTimeout(155);
  const later=await page.locator('[data-combat-current]').innerText();
  assert.notEqual(first,later,'Attack reel must advance with elapsed time');
  await page.keyboard.press('g');
  assert.equal(await page.locator('.combat-reel').getAttribute('data-reel-type'),'POWER');
  for(let i=0;i<20;i++){
    if(!await page.locator('[data-combat-stop]').count())break;
    await page.keyboard.press('y');
  }
  assert.ok(await page.locator('[data-combat-next], [data-combat-next-bout], [data-combat-rematch]').count()>0);
  assert.equal(await page.locator('.combat-battlefield.battlefield-impact').count(),1);
  assert.equal(await page.locator('.battlefield-damage').count(),1);
  const an=await page.locator('.combat-striker .combat-fighter-art')
    .evaluate(el=>getComputedStyle(el).animationName);
  assert.notEqual(an,'none','The original animal portrait should animate on attack');
  assert.match(await page.locator('.combat-message').innerText(),/AMBER FANG|MOONSTEP|SHADOW RESOLVE|GOLDEN HEART|SUNWARD FEINT|SOVEREIGN ROAR/);
}, {reducedMotion:'no-preference'});
await run('battle-feel-reduced-motion-390x844',{width:390,height:844},async page=>{
  await page.locator('.painted-mobile-nav [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="DUEL_SELECT"]').click();
  await page.locator('[data-animal="lion"]').click();
  await page.locator('[data-animal="tiger"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.equal(await page.locator('.combat-battlefield').count(),1);
  assert.ok(await page.locator('[data-combat-stop]').isVisible());
  await page.keyboard.press('g');
  await page.keyboard.press('g');
  await page.keyboard.press('y');
  await page.keyboard.press('y');
  for(let i=0;i<20;i++){
    if(!await page.locator('[data-combat-stop]').count())break;
    await page.keyboard.press('y');
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
  await page.locator('[data-animal="tiger"]').click();
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
  await page.locator('[data-animal="tiger"]').click();
  await page.locator('[data-animal="lion"]').click();
  await page.locator('[data-prototype-intro]').click();
  await page.locator('[data-prototype-fight]').click();
  assert.match(await page.locator('.combat-heading').innerText(),/BOUT 1 · FIRST TO 2/);
  assert.match(await page.locator('.combat-series').innerText(),/PLAYER 2 WINS/);
  assert.equal(await page.locator('.combat-card-reward').count(),0);
});


await run('reference-arena-layout-desktop',{width:1440,height:900},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="SOLO_SELECT"]').click();
  await page.locator('[data-animal="tiger"]').click();
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
  assert.ok(art.length===2&&art.every(n=>n>0),'Both original animal artworks must load');
});
await run('reference-arena-layout-landscape',{width:844,height:390},async page=>{
  await page.locator('.painted-hotspots [data-art-action="PLAY"]').click();
  await page.locator('[data-mode="DUEL_SELECT"]').click();
  await page.locator('[data-animal="lion"]').click();
  await page.locator('[data-animal="tiger"]').click();
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
  assert.equal(await page.locator('.combat-reel').getAttribute('data-reel-type'),'ATTACK',
    'Local player two must get their own attack stop');
});

await browser.close();
if(failures.length) {
  console.error(JSON.stringify(failures,null,2));
  process.exitCode=1;
}
