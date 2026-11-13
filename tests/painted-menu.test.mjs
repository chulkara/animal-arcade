import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const html=readFileSync('index.html','utf8');
const app=readFileSync('src/app.js','utf8');
const overlay=readFileSync('src/painted-menu.js','utf8');
const css=readFileSync('src/painted-menu.css','utf8');

test('the exact original approved painting survives lossless transport',()=>{
  const parts=Array.from({length:20},(_,i)=>
    readFileSync('assets/approved-menu-png/part-'+String(i).padStart(2,'0')+'.txt','utf8'));
  const encoded=parts.join('');
  assert.equal(encoded.length,4226700);
  const raw=Buffer.from(encoded,'base64');
  assert.equal(raw.length,3170023);
  assert.equal(raw.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(createHash('sha256').update(raw).digest('hex'),
    '90fffe36338fc7c939c5e41c62a656a83532f0c1e3254b05cefd6bb9249fc9f4');
});
test('approved menu overlay loads after app and uses original PNG',()=>{
  assert.ok(html.indexOf('src/app.js')<html.indexOf('src/painted-menu.js'));
  assert.ok(html.includes('src/painted-menu.css'));
  assert.ok(overlay.includes("const ART='./assets/approved-menu.png'"));
  assert.ok(overlay.includes('URL.createObjectURL(new Blob([bytes]'));
  assert.ok(css.includes('aspect-ratio:1672 / 941'));
  assert.ok(css.includes('object-fit:contain'));
  assert.ok(!css.includes('object-fit:cover'));
});
test('all five painted buttons navigate without replacing the image',()=>{
  for(const id of ['PLAY','MY_CARDS','BINDER','SHOP','SETTINGS']){
    assert.ok(overlay.includes("id:'"+id+"'"),id);
    assert.ok(app.includes(id+":'"),id);
  }
  assert.ok(app.includes("screen==='MODE_MENU'?modeMenu()"));
  for(const mode of ['SOLO_SELECT','DUEL_SELECT','HELP_PREVIEW'])
    assert.ok(app.includes('data-mode="'+mode+'"'));
});
test('keyboard and portrait touch navigation are implemented',()=>{
  assert.ok(overlay.includes("addEventListener('keydown'"));
  assert.ok(overlay.includes('stopImmediatePropagation()'));
  assert.ok(overlay.includes('painted-mobile-nav'));
  assert.ok(css.includes('@media (max-aspect-ratio: 4/5)'));
});
