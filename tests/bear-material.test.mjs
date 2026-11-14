import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ROLES,COATS,materialRole,textureFor}=require('../src/bear-material-core.js');

test('FBX material ID to body/head/teeth maps exactly as found in source connections',()=>{
 assert.equal(materialRole('Material_003',1),'body');
 assert.equal(materialRole('Material_001',0),'head');
 assert.equal(materialRole('Material_002',0),'teeth');
});
test('unnamed material slots use the FBX declared material connection order',()=>{
 assert.deepEqual([0,1,2].map(i=>materialRole('',i)),['body','head','teeth']);
});
test('brown coats use only supplied source-pack diffuse variants',()=>{
 assert.equal(textureFor('body'),'Bear Body 2.png');
 assert.equal(textureFor('head'),'Bear Head 2.png');
 assert.equal(textureFor('body','classic'),'Bear Body.png');
 assert.equal(textureFor('head','classic'),'Bear Head.png');
 assert.equal(textureFor('teeth'),'Bear Teef.png');
 assert.equal(textureFor('teeth','classic'),'Bear Teef.png');
 assert.deepEqual(ROLES,['body','head','teeth']);
 assert.ok(Object.isFrozen(COATS));
});
test('invalid coat names and material roles are rejected',()=>{
 assert.throws(()=>textureFor('fur'),RangeError);
 assert.throws(()=>textureFor('body','black'),RangeError);
 assert.throws(()=>materialRole('',-1),RangeError);
});
