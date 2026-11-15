import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const roster=require('../src/roster-core.js');

const code=readFileSync('src/prototype.js','utf8');
const app=readFileSync('src/app.js','utf8');
const html=readFileSync('index.html','utf8');
const css=readFileSync('src/prototype.css','utf8');

function harness(){
  const handlers={};
  const screens=[];
  const ui={addEventListener:(name,handler)=>{handlers[name]=handler;}};
  const window={NoahsRoster:roster,__arkade:{openScreen:screen=>screens.push(screen)}};
  runInNewContext(code,{window,document:{getElementById:id=>id==='ui'?ui:null}});
  const click=(selector,dataset={})=>
    handlers.click({target:{closest:s=>s===selector?{dataset}:null}});
  return {prototype:window.NoahsPrototype,screens,click};
}

test('solo selection picks a different CPU opponent and opens the arena',()=>{
  const {prototype,screens,click}=harness();
  prototype.start('SOLO');
  assert.equal(screens.at(-1),'ANIMAL_SELECT');
  click('[data-animal]',{animal:'bear'});
  assert.deepEqual(Array.from(prototype.getState().picks),['bear','moose']);
  assert.equal(screens.at(-1),'BATTLE_STAGE');
  assert.match(prototype.render('BATTLE_STAGE'),/BROWN BEAR/);
  assert.match(prototype.render('BATTLE_STAGE'),/MOUNTAIN MOOSE/);
});
test('two player mode makes two independent, local selections',()=>{
  const {prototype,screens,click}=harness();
  prototype.start('DUEL');
  click('[data-animal]',{animal:'moose'});
  assert.equal(screens.at(-1),'ANIMAL_SELECT');
  click('[data-animal]',{animal:'bear'});
  assert.deepEqual(Array.from(prototype.getState().picks),['moose','bear']);
  assert.equal(screens.at(-1),'BATTLE_STAGE');
});
test('battle staging describes the playable combat while marking historical formulas as unverified',()=>{
  const {prototype,click}=harness();
  prototype.start('SOLO');
  click('[data-animal]',{animal:'bear'});
  click('[data-prototype-intro]');
  assert.equal(prototype.getState().phase,'READY');
  assert.match(prototype.render('BATTLE_STAGE'),/Exact historical damage formulas are still being researched/);
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
