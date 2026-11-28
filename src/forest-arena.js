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
        // Wrap horizontally so the dome has no seam. Each copy needs its OWN
        // gradient centre: reusing the original's drew nothing at the wrap,
        // which cut clouds at u=0/1 into a hard vertical seam in the sky.
        const shifts=[0];if(cx<rad)shifts.push(512);if(cx>512-rad)shifts.push(-512);
        for(const dx of shifts){
          const px=cx+dx,cg=g.createRadialGradient(px,cy,0,px,cy,rad);
          cg.addColorStop(0,'rgba(255,255,255,.55)');cg.addColorStop(1,'rgba(255,255,255,0)');
          g.fillStyle=cg;g.fillRect(px-rad,cy-rad,rad*2,rad*2);
        }
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
      // broadleaf (birch/aspen-like): a thin pale trunk with forked branches and
      // ragged leaf clumps made of many small leaves, not round blobs
      g.clearRect(0,0,256,512);
      g.strokeStyle='#d9d2c0';g.lineCap='round';
      g.lineWidth=9;g.beginPath();g.moveTo(128,512);g.lineTo(126,240);g.stroke();
      g.strokeStyle='#3b3328';for(let y=280;y<500;y+=18+r()*16){g.lineWidth=2;g.beginPath();g.moveTo(123,y);g.lineTo(131,y+2);g.stroke();}
      g.strokeStyle='#cfc6b2';g.lineWidth=4;
      const tips=[];
      for(let k=0;k<7;k++){
        const y0=250+k*22+r()*10,dir=k%2?1:-1,len=40+r()*50;
        const x1=126+dir*len,y1=y0-40-r()*60;
        g.beginPath();g.moveTo(126,y0);g.quadraticCurveTo(126+dir*len*.4,y0-20,x1,y1);g.stroke();tips.push([x1,y1]);
      }
      tips.push([126,200],[110,150],[146,140],[128,100]);
      for(const [tx,ty] of tips){
        const n=70+Math.floor(r()*40),rad=34+r()*20;
        for(let q=0;q<n;q++){
          const a=r()*Math.PI*2,d=Math.sqrt(r())*rad,x=tx+Math.cos(a)*d,y=ty+Math.sin(a)*d*.8;
          const shade=(y-ty)/rad; // lighter on top
          const c2=shade<-.3?'#9cbf5a':shade<.2?'#6f9a3c':'#3f6626';
          g.fillStyle=c2;g.save();g.translate(x,y);g.rotate(r()*Math.PI);
          g.beginPath();g.ellipse(0,0,4+r()*3,2+r()*1.5,0,0,Math.PI*2);g.fill();g.restore();
        }
      }
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
    sky.name='forest-sky';sky.renderOrder=-10;root.add(sky);
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
    const mats=['pine','pine','pine','broad'].map((k,i)=>new THREE.MeshLambertMaterial({
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
  // ── Tileable value-noise fBm (for painterly clouds, rock and dry grass) ──
  function noiseField(size,seed){
    const r=rng(seed),grid=new Float32Array(size*size);
    for(let i=0;i<grid.length;i++)grid[i]=r();
    const at=(x,y)=>grid[((y%size+size)%size)*size+((x%size+size)%size)];
    const sm=t=>t*t*(3-2*t);
    return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=sm(x-xi),fy=sm(y-yi);
      const a=at(xi,yi),b=at(xi+1,yi),c=at(xi,yi+1),d=at(xi+1,yi+1);
      return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;};
  }
  // fBm that tiles over [0,w)×[0,h): each octave's lattice period divides the size.
  function fbm(seed,period=8,octaves=5){
    const fields=[...Array(octaves)].map((_,o)=>({n:noiseField(period<<o,seed+o*131),p:period<<o}));
    return (u,v)=>{let s=0,amp=.5,tot=0;
      for(const f of fields){s+=f.n(u*f.p,v*f.p)*amp;tot+=amp;amp*=.5;}
      return s/tot;};
  }
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=(e0,e1,x)=>{const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0)));return t*t*(3-2*t);};
  function paint(w,h,fn){
    const c=canvas(w,h),g=c.getContext('2d'),img=g.createImageData(w,h),d=img.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const [r,gg,b,a=255]=fn(x/w,y/h,x,y);const k=(y*w+x)*4;
      d[k]=r;d[k+1]=gg;d[k+2]=b;d[k+3]=a;}
    g.putImageData(img,0,0);return c;
  }
  // Open plains "stage" for solo attack shots (title card, strike, launch):
  // a deep PS2-era sky with fat cumulus, layered mesas, dry savanna ground.
  // Hidden by default; the runtime swaps it in for the forest during a film.
  function plainsSkyCanvas(){
    const n=fbm(0x51a,6,6),n2=fbm(0x99c,12,4);
    return paint(1024,512,(u,v)=>{
      // v: 0 = zenith, .5 = horizon. Deep blue that only pales right at the horizon.
      const e=Math.max(0,.5-v)/.5;                       // elevation 0..1
      let r=mix(150,14,Math.pow(e,.38)),g=mix(196,72,Math.pow(e,.42)),b=mix(232,196,Math.pow(e,.5));
      if(v>.5){r=176;g=168;b=128;}
      // cumulus band: squashed toward the horizon like a real dome
      const band=smooth(.06,.2,e)*(1-smooth(.62,.85,e));
      const cv=v*(1+(1-e)*.9);
      const c=n(u*2,cv*2.6)+.22*n2(u*3,cv*5)-.06;
      const cloud=smooth(.5,.64,c)*band;
      if(cloud>0){
        // lit tops, blue-grey undersides
        const shade=smooth(.45,.8,n(u*2,(cv-.016)*2.6))-smooth(.45,.8,c)*.5;
        const lit=mix(238,255,shade),under=[178,192,214];
        const cr=mix(under[0],lit,.55+.45*shade),cg=mix(under[1],lit,.55+.45*shade),cb=mix(under[2],252,.6);
        r=mix(r,cr,cloud);g=mix(g,cg,cloud);b=mix(b,cb,cloud);
      }
      return [r,g,b];
    });
  }
  function plainsHorizonCanvas(){
    const W=2048,H=256,c=canvas(W,H),g=c.getContext('2d'),r=rng(0x77a1),rock=fbm(0x3f1,16,4);
    // three depths of flat-topped mesas, hazier with distance
    const layers=[{haze:.7,y:236,top:[46,78],tone:[150,128,112]},{haze:.5,y:240,top:[36,64],tone:[146,110,84]}];
    for(const L of layers){
      // strata texture for this depth, then each mesa is a clipped cut of it
      const tex=paint(W,H,(u,v)=>{
        const strata=.5+.5*Math.sin(v*90+rock(u*3,v*.6)*7);
        const lum=.74+.2*strata+.2*(rock(u*7,v*3)-.5);
        const sky=[168,196,222];
        return [0,1,2].map(ch=>mix(L.tone[ch]*lum,sky[ch],L.haze));
      });
      let x=-200;
      while(x<W+200){
        const w=220+r()*520,h=L.top[0]+r()*(L.top[1]-L.top[0]),slope=w*(.08+r()*.08);
        g.save();g.beginPath();g.moveTo(x,L.y);g.lineTo(x+slope,L.y-h);
        for(let k=1;k<=8;k++)g.lineTo(x+slope+(w-2*slope)*k/8,L.y-h+(r()-.5)*5);
        g.lineTo(x+w,L.y);g.closePath();g.clip();
        g.drawImage(tex,0,0);
        // shade the right flank, light the left: simple sun from the left
        const sh=g.createLinearGradient(x,0,x+w,0);
        sh.addColorStop(0,'rgba(255,240,210,.10)');sh.addColorStop(.7,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(40,30,40,.22)');
        g.fillStyle=sh;g.fillRect(x,L.y-h-4,w,h+8);
        g.restore();
        x+=w+(r()*300-40);
      }
    }
    // hazy band of acacia scrub on the horizon line
    for(let x=0;x<W;x+=2){const h=4+r()*7+Math.sin(x*.013)*3;g.fillStyle=`rgba(${96+r()*20|0},${98+r()*16|0},${62},.95)`;g.fillRect(x,246-h,2,h+12);}
    for(let i=0;i<70;i++){const x=r()*W,y=244-r()*4,w=10+r()*16;g.fillStyle='rgba(70,78,46,.95)';
      g.beginPath();g.ellipse(x,y-6,w,4,0,0,Math.PI*2);g.fill();g.fillRect(x-1,y-6,2,8);}
    return c;
  }
  function savannaCanvas(){
    const n=fbm(0x5a7,8,5),blade=rng(0x1b3);
    const c=paint(256,256,(u,v)=>{
      const a=n(u,v),b=n(u*2+.3,v*2+.7);
      const dry=[176,152,96],green=[118,122,64],dirt=[150,112,74];
      const t=smooth(.38,.62,a),q=smooth(.55,.75,b);
      return [0,1,2].map(k=>mix(mix(dry[k],green[k],t*.7),dirt[k],q*.45)*(.86+.28*(n(u*8,v*8)-.5)));
    });
    const g=c.getContext('2d');
    for(let i=0;i<2600;i++){const x=blade()*256,y=blade()*256,v=blade();
      g.fillStyle=v<.5?'rgba(84,76,40,.45)':'rgba(222,204,150,.4)';g.fillRect(x,y,1,2+blade()*3);}
    return c;
  }
  function buildPlains(THREE,scene,{shadows=true}={}){
    const root=new THREE.Group();root.name='plains-stage';root.visible=false;
    const sky=new THREE.Mesh(new THREE.SphereGeometry(78,32,16),
      new THREE.MeshBasicMaterial({map:texture(THREE,plainsSkyCanvas()),side:THREE.BackSide,fog:false,depthWrite:false}));
    sky.renderOrder=-10;root.add(sky);
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(42,42,6,64,1,true),
      new THREE.MeshBasicMaterial({map:texture(THREE,plainsHorizonCanvas()),side:THREE.BackSide,transparent:true,alphaTest:.02,fog:false,depthWrite:false}));
    ring.position.y=6/2-.75;ring.renderOrder=-9;root.add(ring);
    const geo=new THREE.PlaneGeometry(90,90,1,1);
    const ground=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({
      map:texture(THREE,savannaCanvas(),{wrap:true,repeat:16})}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.035;ground.receiveShadow=shadows;root.add(ground);
    scene.add(root);
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
  window.NoahsForestArena=Object.freeze({build,buildPlains,cssBackdrop});
})();
// The no-3D fallback arena uses the same painted forest as its backdrop.
document.addEventListener('DOMContentLoaded',()=>{
  const url=window.NoahsForestArena?.cssBackdrop();
  if(url)document.getElementById('game')?.style.setProperty('--forest-backdrop',`url(${url})`);
});
