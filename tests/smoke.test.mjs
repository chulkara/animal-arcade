import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const html=readFileSync('index.html','utf8');
const app=readFileSync('src/app.js','utf8');
const css=readFileSync('src/styles.css','utf8');
const globe=readFileSync('src/globe.js','utf8');
test('title DOM targets and scripts are present',()=>{
  for(const id of ['game','ui','logo-mount','globe-canvas','globe-fallback','foot-hints']) assert.ok(html.includes(`id="${id}"`),id);
  for(const path of ['src/globe.js','src/audio.js','src/app.js','src/styles.css']) assert.ok(existsSync(path));
});
test('all required menu choices exist',()=>{
  for(const name of ['1 PLAYER','2 PLAYERS','MY BINDER','HOW TO PLAY','OPTIONS']) assert.ok(app.includes(`label:'${name}'`),name);
});
test('settings persist locally and are reversible',()=>{
  assert.ok(app.includes('localStorage.setItem'));
  for(const name of ['master','music','sfx','mute','reducedMotion','grain','globe']) assert.ok(app.includes(name));
  assert.ok(app.includes('Escape')&&app.includes('Backspace')&&app.includes('ArrowDown'));
});
test('animated globe has texture and fallback',()=>{
  assert.ok(globe.includes('getContext(\'webgl\''));
  assert.ok(existsSync('assets/globe-map.webp'));
  assert.ok(existsSync('assets/globe-fallback.webp'));
  assert.ok(css.includes('prefers-reduced-motion'));
});