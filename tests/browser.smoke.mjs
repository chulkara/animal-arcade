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

async function run(name,dimensions,steps){
  const context=await browser.newContext({viewport:dimensions,deviceScaleFactor:1,reducedMotion:'reduce'});
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
  await page.locator('[data-back]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MODE_MENU');
  await page.locator('[data-back]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
  await menu.locator('[data-art-action="BINDER"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'BINDER_PREVIEW');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MAIN_MENU');
  await menu.locator('[data-art-action="SHOP"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'SHOP_PREVIEW');
  await page.keyboard.press('Escape');
  await menu.locator('[data-art-action="MY_CARDS"]').click();
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MY_CARDS_PREVIEW');
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
  assert.equal(await page.locator('#game').getAttribute('data-screen'),'MY_CARDS_PREVIEW');
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
  assert.match(await page.locator('.prototype-note').innerText(),/not implemented/);
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

await browser.close();
if(failures.length) {
  console.error(JSON.stringify(failures,null,2));
  process.exitCode=1;
}
