/* Local FBX intake for the private Bear V2 and Moose V2 rigs.
 * Files are read by the browser; no model or texture bytes are uploaded. */
(function(){
  'use strict';
  let dependencies=null;
  const pixel='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  async function getDeps(){
    if(!dependencies)dependencies=Promise.all([
      import('three'),import('three/addons/loaders/FBXLoader.js'),
      import('three/addons/utils/SkeletonUtils.js')
    ]).then(([THREE,fbx,utils])=>({THREE,FBXLoader:fbx.FBXLoader,clone:utils.clone}))
      .catch(error=>{dependencies=null;throw error;});
    return dependencies;
  }
  async function load(id,files,notify=()=>{}){
    const core=window.NoahsArena3DCore;
    const plan=core.planFiles(id,files);
    if(!plan.ready)throw Error(id.toUpperCase()+' missing: '+plan.missing.join(', ')+'. Extract the private Motion Lab ZIP and choose its asset folder.');
    const materialMap=id==='bear'?window.NoahsBearMaterialCore:window.NoahsMooseAssetsCore;
    if(typeof (id==='bear'?materialMap?.materialRole:materialMap?.roleFor)!=='function')
      throw Error('The '+id+' material mapping script did not load. Pull the latest development branch and hard-refresh the game.');
    const {THREE,FBXLoader,clone}=await getDeps();
    const textureUrls=new Map();
    const imageFiles=Array.from(files).filter(f=>/\.(png|jpg|jpeg|webp)$/i.test(f.name));
    for(const f of imageFiles)textureUrls.set(core.basename(f.name),URL.createObjectURL(f));
    const manager=new THREE.LoadingManager();
    manager.setURLModifier(url=>{
      if(/^(blob:|data:)/.test(url))return url;
      return textureUrls.get(core.basename(url))||pixel;
    });
    const fbx=new FBXLoader(manager);
    const loader=new THREE.TextureLoader(manager);
    const textureObjects=[],replacedMaterials=[];
    let model=null;
    try{
      notify('Parsing '+id+' skeleton and skinned meshes…');
      model=fbx.parse(await plan.model.arrayBuffer(),'');
      let bones=0,meshes=0;
      const boneNames=new Set();
      model.traverse(node=>{
        if(node.isBone){bones++;boneNames.add(node.name);}
        if(node.isSkinnedMesh){meshes++;}
      });
      if(meshes<1||bones<20)throw Error(id+' source FBX is missing its expected skinned model or armature');
      const materialTextures={};
      for(const [role,file] of Object.entries(plan.textures)){
        notify('Loading '+id+' '+role+' diffuse texture…');
        const url=textureUrls.get(core.basename(file.name));
        if(!url)throw Error('Missing texture URL for '+file.name);
        const texture=await loader.loadAsync(url);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.anisotropy=4;
        textureObjects.push(texture);
        materialTextures[role]=texture;
      }
      model.traverse(node=>{
        if(!node.isMesh)return;
        node.castShadow=true;
        node.receiveShadow=true;
        const original=Array.isArray(node.material)?node.material:[node.material];
        const material=original.map((item,index)=>{
          const role=id==='bear'?
            materialMap.materialRole(item?.name,index):
            materialMap.roleFor(node.name,item?.name,index);
          const map=materialTextures[role]||null;
          const matte=new THREE.MeshStandardMaterial({
            color:0xffffff,map,roughness:.9,metalness:0,
            side:THREE.FrontSide
          });
          // The mouth interior sits in shadow inside the head, so the small,
          // dark teeth/gum atlas read as a black hole when the jaw opens.
          // Let that one material carry a little of its own light.
          if(id==='bear'&&role==='teeth'&&map){
            matte.emissive=new THREE.Color(0xffffff);
            matte.emissiveMap=map;
            matte.emissiveIntensity=.9;
            matte.color.setScalar(1.35);
            matte.roughness=.55;
          }
          replacedMaterials.push(matte);
          return matte;
        });
        node.material=Array.isArray(node.material)?material:material[0];
      });
      const clips={},motionFiles={};
      for(const [name,file] of Object.entries(plan.clips)){
        const optional=Object.hasOwn(core.OPTIONAL?.[id]||{},name);
        try{
          notify('Preparing '+id+' '+name+' native animation…');
          const parsed=fbx.parse(await file.arrayBuffer(),'');
          const clip=parsed.animations?.[0];
          if(!clip||!clip.tracks?.length||!Number.isFinite(clip.duration)||clip.duration<=0)
            throw Error(id+' motion '+file.name+' contains no usable animation tracks');
          // Native motions target matching Rig* bones; no source bytes
          // or source motion curves are rewritten by this local importer.
          const usable=clip.tracks.filter(track=>{
            const name=track.name.split(/[.\[]/)[0];
            return boneNames.has(name)||model.getObjectByName(name);
          });
          if(!usable.length)throw Error(id+' motion '+file.name+' does not bind to the model skeleton');
          clips[name]=clip;
          motionFiles[name]=file.name;
        }catch(error){
          if(!optional)throw error;
          // A malformed *optional* animation must never break the user's
          // original working Bear V2 load. Fall back to the existing idle.
          notify('Skipping optional '+name+' animation: '+error.message);
        }
      }
      notify(id.toUpperCase()+' · '+bones+' bones, '+meshes+' skinned meshes, '+Object.keys(clips).length+' native clips ready.');
      return {
        id,model,clips,motionFiles,materials:replacedMaterials,textures:textureObjects,
        urls:[...textureUrls.values()],bones,meshes,clone,THREE,
        dispose(){
          for(const material of replacedMaterials)material.dispose();
          for(const texture of textureObjects)texture.dispose();
          for(const url of textureUrls.values())URL.revokeObjectURL(url);
          model?.traverse(node=>{if(node.geometry)node.geometry.dispose();});
        }
      };
    }catch(error){
      for(const material of replacedMaterials)material.dispose();
      for(const texture of textureObjects)texture.dispose();
      for(const url of textureUrls.values())URL.revokeObjectURL(url);
      model?.traverse(node=>{if(node.geometry)node.geometry.dispose();});
      throw error;
    }
  }
  window.NoahsArena3DLoader=Object.freeze({getDeps,load});
})();
