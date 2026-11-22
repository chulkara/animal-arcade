/* Noah's Arkade — PS2-era forest arena.
 * Everything here is generated in code (canvas textures, simple geometry):
 * no downloaded or third-party assets. The look borrows the vocabulary of
 * early-2000s console levels: a painted sky dome, a hazy tree-line panorama,
 * crossed-quad billboard trees with crisp alpha edges, a tiled grass ground
 * with a worn dirt clearing, scattered grass tufts, a few faceted rocks and
 * distance fog.
 *
 * Layout rule (from the camera review): every cinematic camera sits in front
 * of the animals (z >= 2.5) looking back toward them. Scenery therefore lives
 * behind (z < -4) and far to the sides only — nothing is ever placed between a
 * camera and the fighters, and the clearing around the two slots stays open.
 */
(function(){
  'use strict';
  const rng=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

  // ───────────────────────── textures ─────────────────────────
  function skyCanvas(){
    const c=canvas(512,512),g=c.getContext('2d'),r=rng(0x51c7);
    const grad=g.createLinearGradient(0,0,0,512);
    grad.addColorStop(0,'#2f6fc4');grad.addColorStop(.34,'#5f9fe0');
    grad.addColorStop(.47,'#a9d2ee');grad.addColorStop(.5,'#d9ece6');grad.addColorStop(1,'#cfe2d4');
    g.fillStyle=grad;g.fillRect(0,0,512,512);
    // soft painted cloud banks in the upper half
    for(let i=0;i<34;i++){
      const x=r()*512,y=90+r()*140,w=40+r()*120,h=12+r()*26;
      for(let k=0;k<6;k++){
        const cx=x+(r()-.5)*w,cy=y+(r()-.5)*h*.6,rad=h*(.8+r()*.9);
        const cg=g.createRadialGradient(cx,cy,0,cx,cy,rad);
        cg.addColorStop(0,'rgba(255,255,255,.55)');cg.addColorStop(1,'rgba(255,255,255,0)');
        g.fillStyle=cg;g.fillRect(cx-rad,cy-rad,rad*2,rad*2);
        // wrap horizontally so the dome has no seam
        if(cx<rad){g.fillRect(cx+512-rad,cy-rad,rad*2,rad*2);}
        if(cx>512-rad){g.fillRect(cx-512-rad,cy-rad,rad*2,rad*2);}
      }
    }
    return c;
  }
  // one pine silhouette, built from stacked jagged tiers
  function pine(g,x,base,h,w,col,shade,r){
    g.fillStyle=col;
    const tiers=5+Math.floor(r()*3);
    for(let t=0;t<tiers;t++){
      const ty=base-h*(t/tiers)*0.92,tw=w*(1-t/tiers)*(.9+r()*.2),th=h/tiers*1.7;
      g.beginPath();g.moveTo(x-tw,ty);
      const teeth=5;
      for(let k=0;k<=teeth;k++){const px=x-tw+(2*tw)*(k/teeth);g.lineTo(px,ty+(k%2?-th*.12:th*.06));}
      g.lineTo(x,ty-th);g.closePath();g.fill();
      if(shade){g.fillStyle=shade;g.beginPath();g.moveTo(x,ty-th);g.lineTo(x+tw*.95,ty);g.lineTo(x+tw*.15,ty);g.closePath();g.fill();g.fillStyle=col;}
    }
  }
  function panoramaCanvas(){
    const W=2048,H=512,c=canvas(W,H),g=c.getContext('2d'),r=rng(0xf0e57);
    g.clearRect(0,0,W,H);
    // distant hills
    const hill=(y,amp,col,seed)=>{
      const rr=rng(seed);g.fillStyle=col;g.beginPath();g.moveTo(0,H);
      const k1=1+Math.floor(rr()*3),k2=3+Math.floor(rr()*4),p1=rr()*6.28,p2=rr()*6.28;
      for(let x=0;x<=W;x+=8){
        const t=x/W*Math.PI*2;
        g.lineTo(x,y-amp*(.6*Math.sin(t*k1+p1)+.4*Math.sin(t*k2+p2)));
      }
      g.lineTo(W,H);g.closePath();g.fill();
    };
    hill(250,60,'#8fb6b4',11);hill(290,40,'#77a39b',23);
    // three rows of conifers, farther = bluer and paler (aerial perspective)
    const rows=[{y:330,h:[70,120],col:'#5f8f83',sh:'#6f9e92',n:90},
                {y:380,h:[100,170],col:'#3f6f5c',sh:'#4f7f68',n:70},
                {y:430,h:[140,230],col:'#2a5240',sh:'#386450',n:46}];
    for(const row of rows){
      for(let i=0;i<row.n;i++){
        const x=(i+r()*.8)/row.n*W,h=row.h[0]+r()*(row.h[1]-row.h[0]),w=h*(.22+r()*.08);
        pine(g,x,row.y+r()*14,h,w,row.col,row.sh,r);
        if(x<w)pine(g,x+W,row.y,h,w,row.col,row.sh,r);
        if(x>W-w)pine(g,x-W,row.y,h,w,row.col,row.sh,r);
      }
      g.fillStyle=row.col;g.fillRect(0,row.y,W,H-row.y);
    }
    // ground mist band where the forest meets the field
    const mist=g.createLinearGradient(0,380,0,512);
    mist.addColorStop(0,'rgba(214,232,220,0)');mist.addColorStop(1,'rgba(214,232,220,.55)');
    g.fillStyle=mist;g.fillRect(0,380,W,132);
    return c;
  }
  function treeCanvas(kind,seed){
    const c=canvas(256,512),g=c.getContext('2d'),r=rng(seed);
    g.clearRect(0,0,256,512);
    // trunk
    g.fillStyle='#4a3324';g.fillRect(118,360,20,152);
    g.fillStyle='#5f4430';g.fillRect(118,360,7,152);
    if(kind==='pine'){
      pine(g,128,470,440,112,'#1f4a32','#2f6044',r);
      // hand-placed highlight flecks, PS2 texture style
      for(let i=0;i<260;i++){
        const y=40+r()*420,x=128+(r()-.5)*(220*(y/470));
        g.fillStyle=r()<.5?'rgba(120,170,110,.55)':'rgba(10,35,22,.5)';g.fillRect(x,y,3,2);
      }
    }else{
      // broadleaf: clustered canopy blobs
      for(let i=0;i<46;i++){
        const a=r()*Math.PI*2,d=r()*86,x=128+Math.cos(a)*d*1.05,y=200+Math.sin(a)*d*.85,rad=30+r()*28;
        const cg=g.createRadialGradient(x-rad*.3,y-rad*.4,rad*.1,x,y,rad);
        cg.addColorStop(0,'#6f9a4a');cg.addColorStop(.55,'#3f6b2e');cg.addColorStop(1,'#26461f');
        g.fillStyle=cg;g.beginPath();g.arc(x,y,rad,0,Math.PI*2);g.fill();
      }
      for(let i=0;i<220;i++){const x=40+r()*176,y=110+r()*190;g.fillStyle=r()<.5?'rgba(160,200,110,.5)':'rgba(15,40,15,.45)';g.fillRect(x,y,3,3);}
    }
    return c;
  }
  function grassTileCanvas(){
    const c=canvas(256,256),g=c.getContext('2d'),r=rng(0x6a55);
    g.fillStyle='#b9b9a4';g.fillRect(0,0,256,256);
    for(let i=0;i<5200;i++){
      const x=r()*256,y=r()*256,v=r();
      g.fillStyle=v<.33?'rgba(90,96,70,.55)':v<.66?'rgba(210,214,190,.5)':'rgba(140,146,110,.55)';
      g.fillRect(x,y,1+r()*2,2+r()*3);
    }
    return c;
  }
  function tuftCanvas(){
    const c=canvas(128,128),g=c.getContext('2d'),r=rng(0x7f7);
    g.clearRect(0,0,128,128);
    for(let i=0;i<26;i++){
      const x=20+r()*88,h=50+r()*70,lean=(r()-.5)*24;
      g.strokeStyle=r()<.5?'#5c8a3c':'#7aa54a';g.lineWidth=3+r()*2;
      g.beginPath();g.moveTo(x,128);g.quadraticCurveTo(x+lean*.3,128-h*.5,x+lean,128-h);g.stroke();
    }
    return c;
  }

  // ───────────────────────── scene ─────────────────────────
  function texture(THREE,c,{repeat=1,srgb=true,wrap=false}={}){
    const t=new THREE.CanvasTexture(c);
    if(srgb)t.colorSpace=THREE.SRGBColorSpace;
    if(wrap){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);}
    t.anisotropy=4;
    return t;
  }
  function crossedQuad(THREE,mat,w,h){
    const group=new THREE.Group();
    for(const rot of [0,Math.PI/2]){
      const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
      m.position.y=h/2;m.rotation.y=rot;group.add(m);
    }
    return group;
  }
  function build(THREE,scene,{shadows=true}={}){
    const root=new THREE.Group();root.name='forest-arena';
    const r=rng(0xa12e);
    // sky dome (unaffected by fog, always behind everything)
    const sky=new THREE.Mesh(new THREE.SphereGeometry(80,32,16),
      new THREE.MeshBasicMaterial({map:texture(THREE,skyCanvas()),side:THREE.BackSide,fog:false,depthWrite:false}));
    sky.renderOrder=-10;root.add(sky);
    // distant forest panorama ring
    const pano=new THREE.Mesh(new THREE.CylinderGeometry(34,34,17,64,1,true),
      new THREE.MeshBasicMaterial({map:texture(THREE,panoramaCanvas()),side:THREE.BackSide,transparent:true,alphaTest:.02,fog:false,depthWrite:false}));
    pano.position.y=17/2-1.6;pano.renderOrder=-9;root.add(pano);
    // ground: tiled grass texture tinted by vertex colour (green field, worn dirt clearing)
    const geo=new THREE.PlaneGeometry(90,90,90,90);
    const pos=geo.attributes.position,col=new Float32Array(pos.count*3);
    const grass=[.34,.52,.22],grass2=[.27,.44,.2],dirt=[.62,.5,.34];
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=-pos.getY(i); // plane is rotated: y becomes -z
      const clear=Math.max(0,1-Math.hypot(x/6.6,(y-.6)/3.3));
      const wear=Math.min(1,clear*1.6);
      const patch=.5+.5*Math.sin(x*.37+Math.sin(y*.21)*2)*Math.cos(y*.29+x*.07);
      for(let k=0;k<3;k++){
        const g0=grass[k]*(1-patch)+grass2[k]*patch;
        col[i*3+k]=g0*(1-wear)+dirt[k]*wear;
      }
    }
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const ground=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:texture(THREE,grassTileCanvas(),{wrap:true,repeat:30}),vertexColors:true}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.035;ground.receiveShadow=shadows;root.add(ground);
    // billboard trees: behind the fighters and far to the sides only
    const mats=['pine','pine','broad'].map((k,i)=>new THREE.MeshLambertMaterial({
      map:texture(THREE,treeCanvas(k==='pine'?'pine':'broad',0x700+i*97)),alphaTest:.5,side:THREE.DoubleSide}));
    const spots=[];
    for(let i=0;i<46;i++){
      // arc behind the arena: angle measured from straight-behind (-z)
      const a=(r()-.5)*Math.PI*1.25,d=11+r()*11;
      const x=Math.sin(a)*d*1.25,z=-Math.cos(a)*d-2;
      if(z>-4.5&&Math.abs(x)<12)continue;
      spots.push([x,z]);
    }
    for(const [x,z] of spots){
      const h=4.2+r()*3.6,mat=mats[Math.floor(r()*mats.length)];
      const t=crossedQuad(THREE,mat,h*.5,h);
      t.position.set(x,-.05,z);t.rotation.y=r()*Math.PI;
      t.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
      root.add(t);
    }
    // grass tufts: outside the clearing, never in the camera foreground
    const tuftMat=new THREE.MeshLambertMaterial({map:texture(THREE,tuftCanvas()),alphaTest:.45,side:THREE.DoubleSide});
    for(let i=0;i<220;i++){
      const x=(r()-.5)*36,z=-r()*22+4;
      if(Math.hypot(x/7.2,(z-.6)/3.8)<1)continue;
      if(z>1.2&&Math.abs(x)<9)continue;
      const s=.35+r()*.45,t=crossedQuad(THREE,tuftMat,s*1.1,s);
      t.position.set(x,-.04,z);t.rotation.y=r()*Math.PI;root.add(t);
    }
    // a few faceted rocks at the back edge (flat-shaded, very 2000s)
    const rockMat=new THREE.MeshLambertMaterial({color:0x8a8a7e,flatShading:true});
    for(let i=0;i<9;i++){
      const s=.35+r()*.7,rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockMat);
      const x=(r()-.5)*22,z=-6-r()*6;
      rock.position.set(x,s*.35,z);rock.rotation.set(r()*3,r()*3,r()*3);rock.scale.y=.6;
      rock.castShadow=shadows;rock.receiveShadow=shadows;root.add(rock);
    }
    scene.add(root);
    // distance haze that matches the horizon
    scene.fog=new THREE.Fog(0xcfe2d6,18,60);
    return root;
  }
  // A flat painting of the same forest for the no-3D fallback arena (CSS background).
  let cssCache='';
  function cssBackdrop(){
    if(cssCache)return cssCache;
    try{
      const W=1600,H=900,c=canvas(W,H),g=c.getContext('2d');
      g.drawImage(skyCanvas(),0,0,512,256,0,0,W,H*.62);
      g.drawImage(panoramaCanvas(),0,0,1024,512,0,H*.18,W,H*.48);
      const ground=g.createLinearGradient(0,H*.6,0,H);
      ground.addColorStop(0,'#5d7f44');ground.addColorStop(.55,'#6f8a4a');ground.addColorStop(1,'#8a7552');
      g.fillStyle=ground;g.fillRect(0,H*.6,W,H*.4);
      const clearing=g.createRadialGradient(W/2,H*.82,10,W/2,H*.82,W*.38);
      clearing.addColorStop(0,'rgba(170,140,95,.85)');clearing.addColorStop(1,'rgba(170,140,95,0)');
      g.fillStyle=clearing;g.fillRect(0,H*.6,W,H*.4);
      cssCache=c.toDataURL('image/jpeg',.86);
    }catch{cssCache='';}
    return cssCache;
  }
  window.NoahsForestArena=Object.freeze({build,cssBackdrop});
})();
// The no-3D fallback arena uses the same painted forest as its backdrop.
document.addEventListener('DOMContentLoaded',()=>{
  const url=window.NoahsForestArena?.cssBackdrop();
  if(url)document.getElementById('game')?.style.setProperty('--forest-backdrop',`url(${url})`);
});
