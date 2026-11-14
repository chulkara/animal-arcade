import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ANIMALS,IDS,get,opponent,validPicks}=require('../src/roster-core.js');

test('public playable roster is precisely Bear + Moose',()=>{
 assert.deepEqual(IDS,['bear','moose']);
 assert.equal(get('tiger'),null);
 assert.equal(get('lion'),null);
 for(const id of IDS){
   assert.equal(get(id).id,id);
   assert.ok(get(id).art.endsWith('.svg'));
   assert.deepEqual(Object.keys(get(id).moves),['G','T','P','special']);
 }
 assert.ok(Object.isFrozen(ANIMALS));
});
test('solo always faces the other current animal; local mirrors allowed',()=>{
 assert.equal(opponent('bear'),'moose');
 assert.equal(opponent('moose'),'bear');
 assert.ok(validPicks(['bear','moose']));
 assert.ok(validPicks(['bear','bear']));
 assert.ok(!validPicks(['tiger','moose']));
 assert.ok(!validPicks(['moose']));
 assert.throws(()=>opponent('tiger'),RangeError);
});
