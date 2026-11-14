/* FBX Bear Animated.fbx material bindings, verified from the user's source.
 * An exported skinned mesh sm_3_0_0 carries three indexed materials:
 * Material_003 -> Bear Body, Material_001 -> Bear Head,
 * Material_002 -> Bear Teef. Never infer from the black preview.
 * This file contains NO licensed textures or model bytes.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NoahsBearMaterialCore=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const ROLES=Object.freeze(['body','head','teeth']);
  const COATS=Object.freeze({
    light:Object.freeze({body:'Bear Body 2.png',head:'Bear Head 2.png',teeth:'Bear Teef.png'}),
    classic:Object.freeze({body:'Bear Body.png',head:'Bear Head.png',teeth:'Bear Teef.png'})
  });
  function materialRole(name,index){
    const m=String(name||'').toLowerCase();
    if(/material[_-]?003\b/.test(m))return 'body';
    if(/material[_-]?001\b/.test(m))return 'head';
    if(/material[_-]?002\b/.test(m))return 'teeth';
    if(!Number.isInteger(index)||index<0)throw new RangeError('Invalid material index');
    return ROLES[index]||'body';
  }
  function textureFor(role,coat='light'){
    if(!ROLES.includes(role))throw new RangeError('Unknown bear material role');
    if(!Object.hasOwn(COATS,coat))throw new RangeError('Unknown bear coat');
    return COATS[coat][role];
  }
  return Object.freeze({ROLES,COATS,materialRole,textureFor});
});
