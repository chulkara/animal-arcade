import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const code=readFileSync('src/prototype.js','utf8');
const app=readFileSync('src/app.js','utf8');
const html=readFileSync('index.html','utf8');
const css=readFileSync('src/prototype.css','utf8');

function harness(){
  const handlers={};
  const screens=[];
  const ui={addEventListener:(name,handler)=>{handlers[name]=handler;}};
  const window={__arkade:{openScreen:screen=>screens.push(screen)}};
  runInNewContext(code,{window,document:{getElementById:id=>id==='ui'?ui:null}});
  const click=(selector,dataset={})=>
    handlers.click({target:{closest:s=>s===selector?{dataset}:null}});
  return {prototype:window.NoahsPrototype,screens,click};
}

test('solo selection picks a different CPU opponent and opens the arena',()=>{
  const {prototype,screens,click}=harness();
  prototype.start('SOLO');
  assert.equal(screens.at(-1),'ANIMAL_SELECT');
  click('[data-animal]',{animal:'tiger'});
  assert.deepEqual(Array.from(prototype.getState().picks),['tiger','lion']);
  assert.equal(screens.at(-1),'BATTLE_STAGE');
  assert.match(prototype.render('BATTLE_STAGE'),/BLUE TIGER/);
  assert.match(prototype.render('BATTLE_STAGE'),/GOLDEN LION/);
});
test('two player mode makes two independent, local selections',()=>{
  const {prototype,screens,click}=harness();
  prototype.start('DUEL');
  click('[data-animal]',{animal:'lion'});
  assert.equal(screens.at(-1),'ANIMAL_SELECT');
  click('[data-animal]',{animal:'tiger'});
  assert.deepEqual(Array.from(prototype.getState().picks),['lion','tiger']);
  assert.equal(screens.at(-1),'BATTLE_STAGE');
});
test('battle staging explicitly does not pretend to implement combat',()=>{
  const {prototype,click}=harness();
  prototype.start('SOLO');
  click('[data-animal]',{animal:'tiger'});
  click('[data-prototype-intro]');
  assert.equal(prototype.getState().phase,'READY');
  assert.match(prototype.render('BATTLE_STAGE'),/not implemented/);
  click('[data-prototype-restart]');
  assert.equal(prototype.getState().picks.length,0);
});
test('prototype preserves approved main menu and remains linked',()=>{
  assert.ok(html.includes('src/prototype.js'));
  assert.ok(html.includes('src/prototype.css'));
  assert.ok(app.includes("screen==='MODE_MENU'?modeMenu()"));
  assert.ok(app.includes('window.NoahsPrototype.render(screen)'));
  assert.ok(app.includes('window.NoahsPrototype?.start('));
  assert.ok(css.includes('.animal-grid'));
  assert.ok(css.includes('.arena'));
});
