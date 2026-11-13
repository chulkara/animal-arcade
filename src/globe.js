/* Original, dependency-free WebGL globe for Noah's Arkade.
   Painterly cartography in /public/assets/globe-map.webp; graphics stay local. */
(function () {
  'use strict';
  const VERTEX = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aUv;
    uniform float uTime;
    uniform float uTilt;
    varying vec3 vNormal;
    varying vec3 vWorld;
    varying vec2 vUv;
    void main() {
      float a = uTime;
      mat3 spin = mat3(cos(a),0.0,sin(a), 0.0,1.0,0.0, -sin(a),0.0,cos(a));
      mat3 tilt = mat3(cos(uTilt), sin(uTilt),0.0, -sin(uTilt),cos(uTilt),0.0, 0.0,0.0,1.0);
      vec3 p = tilt * spin * aPosition;
      vNormal = normalize(tilt * spin * aNormal);
      vWorld = p;
      vUv = aUv;
      gl_Position = vec4(p.xy * 0.93, p.z * 0.25, 1.0);
    }
  `;
  const FRAGMENT = `
    precision mediump float;
    uniform sampler2D uMap;
    varying vec3 vNormal;
    varying vec3 vWorld;
    varying vec2 vUv;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 lightDir = normalize(vec3(-0.56,0.49,0.82));
      float diffuse = max(dot(n,lightDir),0.0);
      float ambient = 0.33;
      float light = ambient + 0.84*diffuse;
      vec3 source = texture2D(uMap,vUv).rgb;
      float night = smoothstep(0.28,0.04,diffuse);
      vec3 color = source * light;
      //IF_OFF
      float rim = pow(1.0 - max(dot(n,vec3(0.0,0.0,1.0)),0.0), 4.6);
      color += vec3(0.17,0.36,0.48) * rim * 0.43;
      color += vec3(0.16,0.11,0.047) * pow(diffuse, 6.0)*0.35;
      color = mix(color, color*vec3(0.81,0.94,1.12),night*0.24);
      gl_FragColor = vec4(color, 1.0);
    }
  `.replace('      //IF_OFF\n','');

  function shader(gl, kind, source) {
    const s = gl.createShader(kind); gl.shaderSource(s,source); gl.compileShader(s);
    if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) {
      const error=gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(error);
    }
    return s;
  }
  function program(gl) {
    const p = gl.createProgram();
    const vs=shader(gl,gl.VERTEX_SHADER,VERTEX), fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
    gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function sphere(segments=144, rings=96) {
    const vertices=[], normals=[], uvs=[], indices=[];
    for (let row=0;row<=rings;row++) {
      const v=row/rings, theta=v*Math.PI;
      for (let col=0;col<=segments;col++) {
        const u=col/segments, phi=u*Math.PI*2;
        const x=Math.sin(theta)*Math.sin(phi);
        const y=Math.cos(theta), z=Math.sin(theta)*Math.cos(phi);
        vertices.push(x,y,z); normals.push(x,y,z); uvs.push(u,1-v);
      }
    }
    for (let row=0;row<rings;row++) for(let col=0;col<segments;col++) {
      const a=row*(segments+1)+col, b=a+segments+1;
      indices.push(a,b,a+1,b,b+1,a+1);
    }
    return {vertices:new Float32Array(vertices),normals:new Float32Array(normals),uvs:new Float32Array(uvs),indices:new Uint16Array(indices)};
  }
  function mount(canvas, onFallback) {
    let gl, prog, buffers=[], tex, raf=0, stopped=false, last=0, angle=-0.34;
    let shouldRotate=true, reduced=false, visible=true;
    try {
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false,premultipliedAlpha:true}) ||
         canvas.getContext('experimental-webgl',{alpha:true,antialias:true});
      if(!gl) throw new Error('WebGL is unavailable');
      prog=program(gl);
      const data=sphere(); gl.useProgram(prog);
      function attribute(name, values, width) {
        const b=gl.createBuffer(); buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER,b);
        gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);
        const loc=gl.getAttribLocation(prog,name);
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,width,gl.FLOAT,false,0,0);
      }
      attribute('aPosition',data.vertices,3); attribute('aNormal',data.normals,3);attribute('aUv',data.uvs,2);
      const index=gl.createBuffer(); buffers.push(index);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,data.indices,gl.STATIC_DRAW);
      tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([70,93,106,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.uniform1i(gl.getUniformLocation(prog,'uMap'),0);
      gl.uniform1f(gl.getUniformLocation(prog,'uTilt'),0.12);
      const img=new Image();
      img.onload=()=>{
        if(stopped)return;
        gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        gl.generateMipmap(gl.TEXTURE_2D);
      };
      img.onerror=()=>onFallback('Texture could not load');
      img.src=new URL('assets/globe-map.webp',document.baseURI).href;
      const resize=()=>{
        if(stopped)return;
        const rect=canvas.getBoundingClientRect();
        const size=Math.max(1,Math.round(Math.min(rect.width* Math.min(window.devicePixelRatio||1,2),1450)));
        if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;}
        gl.viewport(0,0,canvas.width,canvas.height);
      };
      const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
      if(ro)ro.observe(canvas); else window.addEventListener('resize',resize);
      resize();
      const frame=(now)=>{
        if(stopped)return;
        const dt=Math.min(64,(now-last)||16.7);last=now;
        if(shouldRotate&&!reduced&&visible)angle+=dt*.000064;
        if(visible){
          gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
          gl.uniform1f(gl.getUniformLocation(prog,'uTime'),angle);
          gl.drawElements(gl.TRIANGLES,data.indices.length,gl.UNSIGNED_SHORT,0);
        }
        raf=requestAnimationFrame(frame);
      };
      const onVisibility=()=>{visible=!document.hidden;last=0;};
      const onLost=(e)=>{e.preventDefault();onFallback('WebGL context lost');};
      document.addEventListener('visibilitychange',onVisibility);
      canvas.addEventListener('webglcontextlost',onLost,false);
      raf=requestAnimationFrame(frame);
      return {
        update({rotate,motion}){shouldRotate=rotate;reduced=motion;},
        destroy(){stopped=true;cancelAnimationFrame(raf);ro?.disconnect();if(!ro)window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);canvas.removeEventListener('webglcontextlost',onLost);buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteTexture(tex);gl.deleteProgram(prog);}
      };
    } catch(err) {console.warn('[Noah\'s Arkade] Globe fallback:',err);onFallback(String(err));return {update(){},destroy(){cancelAnimationFrame(raf)}};}
  }
  window.NoahsGlobe={mount};
})();