// The Noah's Arkade title globe: a real rotating sphere with an original
// hand-painted map texture, illustrated (non-photoreal) lighting, engraved
// graticule, warm terminator, atmospheric rim and subtle ordered dithering.
import * as THREE from 'three';
import type { Stage } from '../../app/navigation';
import { globeLayout, type GlobeLayout } from './layout';

const GLOBE_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vObj;
varying vec2 vUv;
void main() {
  vUv = uv;
  vObj = normalize(position);
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const GLOBE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uLand;
uniform vec3 uLight;
uniform float uReveal;
uniform float uDim;
uniform float uDither;
varying vec3 vN;
varying vec3 vObj;
varying vec2 vUv;

float bayer4(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  int i = int(q.x + q.y * 4.0);
  float m[16];
  m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
  m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
  return 0.0;
}

float gridLine(float v, float spacing, float w) {
  float d = abs(fract(v / spacing + 0.5) - 0.5) * spacing;
  return 1.0 - smoothstep(0.45 * w, 1.4 * w, d);
}

void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(uLight);
  vec3 albedo = texture2D(uMap, vUv).rgb;
  float land = texture2D(uLand, vUv).r;

  float ndl = dot(n, L);
  float lit = smoothstep(0.0, 1.0, clamp((ndl + 0.32) / 1.32, 0.0, 1.0));
  lit = mix(lit, floor(lit * 5.0 + 0.5) / 5.0, 0.22); // a touch of painted banding

  vec3 night = albedo * vec3(0.20, 0.23, 0.42) + vec3(0.012, 0.016, 0.05);
  vec3 day = albedo * (0.9 + 0.22 * max(ndl, 0.0));
  vec3 col = mix(night, day, lit);

  // Warm amber terminator, like late light on an old print.
  float term = exp(-pow((ndl - 0.04) / 0.2, 2.0));
  col += vec3(0.62, 0.34, 0.12) * term * 0.16;

  // Soft gilded sheen on water only.
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 28.0) * (1.0 - land);
  col += vec3(1.0, 0.84, 0.52) * spec * 0.28;

  // Engraved graticule every 15 degrees; equator and tropics slightly stronger.
  float lat = degrees(asin(clamp(vObj.y, -1.0, 1.0)));
  float lon = degrees(atan(vObj.z, vObj.x));
  float wLat = fwidth(lat);
  float wLon = min(fwidth(lon), fwidth(mod(lon + 360.0, 360.0))); // seam-safe derivative
  float g = max(gridLine(lat, 15.0, wLat), gridLine(lon, 15.0, wLon) * (1.0 - smoothstep(70.0, 84.0, abs(lat))));
  float eq = gridLine(lat, 180.0, wLat);
  vec3 gold = vec3(0.93, 0.79, 0.5);
  col = mix(col, gold, (g * 0.2 + eq * 0.18) * (0.35 + 0.65 * lit));

  // Atmospheric rim: cobalt on the shadow side, gold where the light grazes.
  float fres = pow(1.0 - max(n.z, 0.0), 2.6);
  vec3 rimCol = mix(vec3(0.24, 0.42, 0.86), vec3(1.0, 0.8, 0.46), smoothstep(-0.2, 0.6, dot(normalize(n.xy + 1e-4), normalize(L.xy))));
  col += rimCol * fres * 0.5;

  // Intro: start as a rim-lit silhouette, then the surface catches the light.
  vec3 silhouette = rimCol * fres * 0.65 + albedo * 0.025;
  col = mix(silhouette, col, uReveal) * uDim;

  col += (bayer4(gl_FragCoord.xy) - 0.5) * uDither;
  gl_FragColor = vec4(col, 1.0);
}`;

const HALO_FRAG = /* glsl */ `
uniform float uReveal;
uniform float uDim;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0; // 0 centre, 1 edge of quad
  float r = d * 1.45; // globe edge sits at d = 1/1.45
  float outer = (1.0 - smoothstep(0.0, 0.45, r - 1.0)) * step(1.0, r);
  float glow = exp(-pow((r - 1.0) / 0.22, 2.0));
  // celestial ring with engraved ticks every 5 degrees (longer every 30)
  float ang = degrees(atan(vUv.y - 0.5, vUv.x - 0.5));
  float aw = fwidth(r);
  float ring = 1.0 - smoothstep(0.5 * aw, 1.5 * aw, abs(r - 1.16));
  float ring2 = 1.0 - smoothstep(0.5 * aw, 1.5 * aw, abs(r - 1.2));
  float tickAng = abs(fract(ang / 5.0 + 0.5) - 0.5) * 5.0;
  float tickW = fwidth(ang) * 1.0;
  float major = step(abs(fract(ang / 30.0 + 0.5) - 0.5) * 30.0, 0.6);
  float tick = (1.0 - smoothstep(0.3 * tickW, 1.2 * tickW, tickAng)) * step(1.16, r) * step(r, mix(1.2, 1.235, major));
  float rings = max(max(ring, ring2 * 0.6), tick * 0.8);
  vec3 c = vec3(0.86, 0.66, 0.36) * glow * 0.22 + vec3(0.22, 0.32, 0.7) * outer * 0.10 + vec3(0.85, 0.68, 0.38) * rings * 0.5;
  float a = clamp(glow * 0.32 + outer * 0.16 + rings * 0.3, 0.0, 1.0) * uReveal * mix(0.55, 1.0, uDim);
  gl_FragColor = vec4(c, a);
}`;

const PASS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aDepth;
uniform vec2 uRes;
uniform vec2 uParallax;
uniform float uTime;
uniform float uPx;
varying float vTw;
varying float vDepth;
void main() {
  vec2 p = position.xy * uRes * 0.5 + uParallax * aDepth;
  vTw = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase * 0.9) + aPhase * 6.283);
  vDepth = aDepth;
  gl_PointSize = aSize * uPx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, -500.0, 1.0);
}`;

const STAR_FRAG = /* glsl */ `
uniform float uReveal;
varying float vTw;
varying float vDepth;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  // four-point glint for the brightest stars, round dot for the rest
  float core = 1.0 - smoothstep(0.0, 0.5, d);
  float cross = max(1.0 - smoothstep(0.0, 0.08, abs(c.x)), 1.0 - smoothstep(0.0, 0.08, abs(c.y))) * (1.0 - smoothstep(0.1, 0.5, d)) * step(0.85, vDepth);
  float a = max(core * core, cross * 0.6) * vTw * uReveal;
  vec3 col = mix(vec3(0.93, 0.88, 0.76), vec3(1.0, 0.82, 0.52), vDepth);
  gl_FragColor = vec4(col, a * 0.85);
}`;

export interface GlobeOptions {
  stage: Stage;
  motion: boolean; // globe rotation enabled
  reduced: boolean; // reduced-motion preference
  onFail?: () => void;
}

export class GlobeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
  private tilt = new THREE.Group();
  private globe: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private halo: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private stars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private textures: THREE.Texture[] = [];
  private raf = 0;
  private last = 0;
  private time = 0;
  private spin = 0;
  private spinSpeed = 0;
  private w = 1;
  private h = 1;
  private cur: GlobeLayout = { cx: 0, cy: 0, r: 1, dim: 1 };
  private stage: Stage;
  private motion: boolean;
  private reduced: boolean;
  private reveal = 0;
  private revealTarget = 0;
  private pointer = new THREE.Vector2();
  private pointerSmoothed = new THREE.Vector2();
  private disposed = false;
  private onFail?: () => void;

  constructor(private canvas: HTMLCanvasElement, opts: GlobeOptions) {
    this.stage = opts.stage;
    this.motion = opts.motion;
    this.reduced = opts.reduced;
    this.onFail = opts.onFail;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // shading is authored in display space
    this.renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', this.handleLost, false);

    const small = Math.min(window.innerWidth, window.innerHeight) < 600;
    const loader = new THREE.TextureLoader();
    const base = import.meta.env.BASE_URL;
    const map = loader.load(`${base}textures/${small ? 'globe-albedo-small' : 'globe-albedo'}.webp`, () => this.kick());
    const land = loader.load(`${base}textures/globe-landmask.webp`, () => this.kick());
    for (const t of [map, land]) {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      t.wrapS = THREE.RepeatWrapping;
    }
    this.textures.push(map, land);

    this.globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, small ? 72 : 128, small ? 48 : 96),
      new THREE.ShaderMaterial({
        vertexShader: GLOBE_VERT,
        fragmentShader: GLOBE_FRAG,
        uniforms: {
          uMap: { value: map },
          uLand: { value: land },
          uLight: { value: new THREE.Vector3(-0.8, 0.42, 0.44) },
          uReveal: { value: 0 },
          uDim: { value: 1 },
          uDither: { value: 1 / 64 },
        },
      }),
    );
    this.tilt.rotation.z = 0.36; // axial tilt
    this.tilt.rotation.x = 0.18; // show a little more of the north
    this.tilt.add(this.globe);
    this.scene.add(this.tilt);

    this.halo = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: PASS_VERT,
        fragmentShader: HALO_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uReveal: { value: 0 }, uDim: { value: 1 } },
      }),
    );
    this.halo.position.z = -100;
    this.scene.add(this.halo);

    this.stars = this.makeStars(small ? 160 : 320);
    this.scene.add(this.stars);

    this.resize();
    this.cur = globeLayout(this.stage, this.w, this.h);
    this.start();
  }

  private makeStars(count: number) {
    // Deterministic placement so the sky is identical every visit.
    let s = 1337;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const depth = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rnd() * 2 - 1;
      pos[i * 3 + 1] = rnd() * 2 - 1;
      const d = Math.pow(rnd(), 3);
      depth[i] = d;
      size[i] = 1.2 + d * 4.2;
      phase[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
    return new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uRes: { value: new THREE.Vector2(1, 1) },
          uParallax: { value: new THREE.Vector2() },
          uTime: { value: 0 },
          uPx: { value: 1 },
          uReveal: { value: 0 },
        },
      }),
    );
  }

  private handleLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.onFail?.();
  };

  resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.w = w;
    this.h = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
    const su = this.stars.material.uniforms;
    su.uRes.value.set(w, h);
    su.uPx.value = dpr;
    if (this.reduced) this.cur = globeLayout(this.stage, w, h);
    this.kick();
  };

  setStage(stage: Stage) {
    this.stage = stage;
    if (stage !== 'dark') this.revealTarget = 1;
    if (this.reduced) this.cur = globeLayout(stage, this.w, this.h);
    this.kick();
  }

  /** Begin (or instantly complete) the intro light-up. */
  setRevealTarget(v: number, instant = false) {
    this.revealTarget = v;
    if (instant) this.reveal = v;
    this.kick();
  }

  setMotion(motion: boolean, reduced: boolean) {
    this.motion = motion;
    this.reduced = reduced;
    if (reduced) this.cur = globeLayout(this.stage, this.w, this.h);
    this.kick();
  }

  setPointer(nx: number, ny: number) {
    this.pointer.set(nx, ny);
    if (!this.reduced && this.motion) this.kick();
  }

  private start() {
    this.last = performance.now();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.kick();
  }

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else this.kick();
  };

  private kick() {
    if (this.disposed || this.raf || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const animating = this.update(dt);
    try {
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.onFail?.();
      return;
    }
    if (animating) this.raf = requestAnimationFrame(this.frame);
  };

  /** Advance the simulation; returns true while anything is still moving. */
  private update(dt: number): boolean {
    let moving = false;
    const approach = (cur: number, target: number, rate: number) => {
      const k = 1 - Math.exp(-rate * dt);
      const next = cur + (target - cur) * k;
      if (Math.abs(target - next) > 0.0005 * Math.max(1, Math.abs(target))) moving = true;
      else return target;
      return next;
    };

    // Spin: eased in/out so toggling rotation never jerks; never resets (angle wraps smoothly).
    const targetSpeed = this.motion ? (this.reduced ? 0.03 : 0.085) : 0;
    this.spinSpeed = approach(this.spinSpeed, targetSpeed, 2.5);
    this.spin = (this.spin + this.spinSpeed * dt) % (Math.PI * 2);
    this.globe.rotation.y = this.spin;
    if (this.spinSpeed > 0) moving = true;

    this.reveal = approach(this.reveal, this.revealTarget, 1.05);

    const target = globeLayout(this.stage, this.w, this.h);
    const rate = 3.2;
    this.cur = {
      cx: approach(this.cur.cx, target.cx, rate),
      cy: approach(this.cur.cy, target.cy, rate),
      r: approach(this.cur.r, target.r, rate),
      dim: approach(this.cur.dim, target.dim, rate),
    };

    const par = this.reduced || !this.motion ? 0 : 1;
    this.pointerSmoothed.x = approach(this.pointerSmoothed.x, this.pointer.x * par, 2);
    this.pointerSmoothed.y = approach(this.pointerSmoothed.y, this.pointer.y * par, 2);

    const { cx, cy, r, dim } = this.cur;
    const px = cx - this.w / 2 + this.pointerSmoothed.x * 6;
    const py = this.h / 2 - cy - this.pointerSmoothed.y * 4;
    this.tilt.position.set(px, py, 0);
    this.tilt.scale.setScalar(r);
    this.tilt.rotation.x = 0.18 + this.pointerSmoothed.y * 0.025;
    this.halo.position.set(px, py, -100);
    this.halo.scale.setScalar(r * 2 * 1.45);

    const gu = this.globe.material.uniforms;
    gu.uReveal.value = this.reveal;
    gu.uDim.value = dim;
    this.halo.material.uniforms.uReveal.value = this.reveal;
    this.halo.material.uniforms.uDim.value = dim;

    if (this.motion && !this.reduced) {
      this.time += dt;
      moving = true;
    }
    const su = this.stars.material.uniforms;
    su.uTime.value = this.time;
    su.uReveal.value = Math.min(1, this.reveal * 1.4);
    su.uParallax.value.set(-this.pointerSmoothed.x * 14, this.pointerSmoothed.y * 10);
    return moving;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.handleLost);
    this.globe.geometry.dispose();
    this.globe.material.dispose();
    this.halo.geometry.dispose();
    this.halo.material.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
  }
}
