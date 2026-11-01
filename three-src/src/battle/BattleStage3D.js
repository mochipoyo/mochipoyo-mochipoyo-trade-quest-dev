/* =========================================================
   BattleStage3D（v6.5 Phase D）：3D版の戦闘の舞台
   ・戦闘の背景を Three.js の3Dの舞台で描き、2D版の戦闘画面（敵の絵・HP・数字・2Dの演出）の下に敷く
     （戦闘の中身・順番・時刻表は2D版と同じ。2D版の battle.js が毎フレーム BattleStage3D.frame() を呼び、返った絵を背景に使う）
   ・舞台：14の場所ごとの地形（草原の丘・森・洞窟の岩と結晶・鉱山の坑木・城の柱と絨毯・港の桟橋・海・砂丘・雪原・溶岩・魔導の塔・機械の街・雲海・暗黒の岩）
     遠景は2D版と同じ背景（BattleBG65）の絵を奥の板に貼る（2D版と同じ景色がつながる）
   ・光：半球光＋太陽（影あり。軽量画質では影なし）＋松明・溶岩・結晶の点光源（ゆらぐ）／夜は暗く青く
   ・粒：場所ごとの粒（雪・火の粉・砂・魔力の粒・データの光・灰・ほたる・木の葉・しぶき）
   ・カメラ：ゆっくり揺れる／ボス戦は登場に合わせて引きから寄る／大技の命中で小さく揺れる
   ・演出：FX65.on('play') を受け取り、同じ時刻表（構え・命中の時刻）で、3Dの粒・光の柱・地面の衝撃波・ローソク足・光の明滅を出す
   ・失敗したとき（WebGL が使えない・作れない）は null を返し、2D版の背景のまま進む
   ========================================================= */
import * as THREE from 'three';

const G = typeof window !== 'undefined' ? window : globalThis;
const TAU = Math.PI * 2;
function h1(x) { const n = Math.sin(x * 12.9898) * 43758.5453; return n - Math.floor(n); }
function col(c) { try { return new THREE.Color(c); } catch (e) { return new THREE.Color(0xffffff); } }

// 演出の種類 → 3Dの動き
const FAMILY = {
  strike: ['slash', 'slash_multi', 'pierce', 'heavy', 'claws', 'fist', 'spin', 'shield_hit', 'shadow_dash', 'steal'],
  travel: ['arrow', 'throw', 'coins', 'gear_shot', 'fireball', 'fire_lance', 'icicle', 'wind_blade', 'dark_orb'],
  rain: ['arrow_rain', 'icicle_rain', 'meteor', 'stardust', 'heal_rain'],
  burst: ['explosion', 'pale_flame', 'holy_burst', 'discharge', 'dark_mist', 'arcane', 'void_bolt'],
  column: ['bolt', 'holy_beam', 'revive_pillar'],
  swirl: ['blizzard', 'tornado', 'whirlpool', 'aurora', 'sleep_mist', 'poison_mist', 'smoke'],
  ring: ['clock', 'time_stop', 'rewind'],
  rise: ['heal_glow', 'purify', 'mana', 'regen', 'weapon_glow', 'haste', 'aura', 'barrier', 'cover', 'counter_stance', 'risk_shield'],
  sink: ['debuff_aura', 'seal', 'confuse_stars', 'scan', 'chart_eye'],
  chart: ['candles', 'ema_line', 'wave', 'rci', 'macd', 'trend_break', 'resistance_break', 'ledger']
};
const FAMILY_OF = {}; Object.keys(FAMILY).forEach((f) => FAMILY[f].forEach((k) => { FAMILY_OF[k] = f; }));
export function familyOf(kind) { return FAMILY_OF[kind] || 'burst'; }
export const FAMILY_TABLE = FAMILY_OF;

const PART_VS = `
attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float uScale;
void main() { vC = rgba; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`;
const PART_FS = `
varying vec4 vC; void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(vC.rgb * (0.6 + a), vC.a * a); }`;

class Particles {
  constructor(n, scale) {
    this.n = n; this.live = 0; this.p = []; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.rgba = new Float32Array(n * 4); this.size = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('rgba', new THREE.BufferAttribute(this.rgba, 4)); g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({ vertexShader: PART_VS, fragmentShader: PART_FS, uniforms: { uScale: { value: scale } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 10; this.geo = g;
  }
  add(o) { if (this.p.length >= this.n) this.p.shift(); this.p.push(o); }
  update(dt) {
    const P = this.p; let w = 0;
    for (let i = 0; i < P.length; i++) { const q = P[i]; q.t += dt; if (q.t >= q.life) continue; q.vy -= (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; if (q.drag) { q.vx *= 1 - q.drag * dt; q.vy *= 1 - q.drag * dt; q.vz *= 1 - q.drag * dt; } if (q.swirl) { const a = q.swirl * dt, cx = q.cx, cz = q.cz, dx = q.x - cx, dz = q.z - cz; q.x = cx + dx * Math.cos(a) - dz * Math.sin(a); q.z = cz + dx * Math.sin(a) + dz * Math.cos(a); } P[w++] = q; }
    P.length = w;
    for (let i = 0; i < this.n; i++) {
      const q = P[i]; const j = i * 3, k = i * 4;
      if (!q) { this.size[i] = 0; this.rgba[k + 3] = 0; continue; }
      const f = q.t / q.life; this.pos[j] = q.x; this.pos[j + 1] = q.y; this.pos[j + 2] = q.z;
      this.rgba[k] = q.c.r; this.rgba[k + 1] = q.c.g; this.rgba[k + 2] = q.c.b; this.rgba[k + 3] = (q.a || 1) * (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85);
      this.size[i] = q.s * (q.grow ? 1 + f * q.grow : 1);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.rgba.needsUpdate = true; this.geo.attributes.size.needsUpdate = true;
  }
  clear() { this.p.length = 0; }
}

export class BattleStage3D {
  constructor(quality) {
    this.quality = quality === 'low' ? 'low' : 'high'; this.failed = false; this.scene3 = null; this.lastScene = null; this.fxq = []; this.flashes = []; this.meshFx = []; this.shake = 0; this.stats = { builds: 0, frames: 0, fx: 0, lastBuildMs: 0 };
    this.canvas = document.createElement('canvas'); this.canvas.width = 640; this.canvas.height = 416;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.quality === 'high', alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = this.quality === 'high'; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.pr = Math.min(G.devicePixelRatio || 1, this.quality === 'high' ? 1.5 : 1); r.setPixelRatio(this.pr);
    this.camera = new THREE.PerspectiveCamera(40, 640 / 416, 0.1, 400);
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.failed = true; });
    if (G.FX65 && G.FX65.on) G.FX65.on((type, data) => { try { if (type === 'play') this.onFx(data); } catch (e) { console.warn('3D FX', e); } });
  }
  enabled() {
    if (this.failed) return false;
    try { if (localStorage.getItem('mtq3d-battle') === 'off') return false; } catch (e) { /* なし */ }
    const BG = G.BattleBG65; if (BG && BG.quality && BG.quality() === 'low') return false;   // 2D版の設定「戦闘背景の品質：軽量」は、3D版でも軽い2Dの背景にする
    return true;
  }
  /* ---------- 2D版の battle.js から毎フレーム呼ばれる。描けたら canvas、だめなら null ---------- */
  frame(scene, W, H) {
    if (!this.enabled() || !scene || !scene.bg65) return null;
    const now = performance.now();
    if (scene !== this.lastScene) { this.build(scene, W, H); this.lastScene = scene; this.t0 = now; this.last = now; scene._stage3d = true; }
    if (!this.scene3) return null;
    this.cw = W; this.ch = H;
    if (this.size !== W + 'x' + H) { this.size = W + 'x' + H; this.renderer.setSize(W, H, false); this.camera.aspect = W / H; this.camera.updateProjectionMatrix(); }
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; const t = (now - this.t0) / 1000;
    this.update(dt, t, scene, W, H);
    this.renderer.render(this.scene3, this.camera); this.stats.frames++;
    return this.canvas;
  }
  /* ---------- 舞台を作る ---------- */
  build(scene, W, H) {
    const t0 = performance.now(); this.dispose();
    const info = scene.bg65; const BG = G.BattleBG65; const P = (BG.PAL && BG.PAL[info.region]) || (BG.PAL && BG.PAL.arcadia);
    const S = this.scene3 = new THREE.Scene(); this.info = info; this.P = P; this.fxq = []; this.flashes = []; this.meshFx = []; this.shake = 0; this.flick = []; this.anim = [];
    const place = info.place; const indoor = place === 'cave' || place === 'mine' || place === 'castle'; this.indoor = indoor;
    const far = indoor ? 18 : 62; this.far = far; const night = info.night;
    // カメラ：敵の足もと（画面の高さの 56%）が地面の z=0 の線に重なるように
    this.camBase = new THREE.Vector3(0, 1.1, 9); const fovH = THREE.MathUtils.degToRad(this.camera.fov / 2); this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
    const thetaPoint = Math.atan2(this.camBase.y, this.camBase.z); this.pitch = thetaPoint - Math.atan(0.12 * Math.tan(fovH));
    // 遠景：2D版の背景（同じ景色・同じ地平線）を奥の板に貼る。板の地平線（絵の上から 58%）を 3D の地平線に合わせ、画面の上の端まで覆う
    const dist = far + this.camBase.z, hz3 = 0.7; const topY = this.camBase.y - dist * Math.tan(this.pitch) + dist * Math.tan(fovH) + 1.5 + 6.6 * dist / 71;
    const hgt = (topY - hz3) / 0.58, wid = 2 * dist * Math.tan(fovH) * (W / H) * 1.18; const bw = Math.min(2048, Math.round(H * wid / hgt));
    const bgc = BG.render(info, bw, H) || scene.bg;
    if (bgc) { const tex = new THREE.CanvasTexture(bgc); tex.colorSpace = THREE.SRGBColorSpace; this.backTex = tex;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, hgt), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false, depthWrite: false }));
      m.position.set(0, hz3 + hgt * 0.08, -far); m.renderOrder = -10; S.add(m); }
    // 霧（遠くを背景の色に溶かす）
    const fogC = col(indoor ? (place === 'castle' ? P.far : '#140e12') : (P.sky ? P.sky[1] : '#c0d4e8')); if (night) fogC.multiplyScalar(0.45);
    S.fog = new THREE.Fog(fogC, indoor ? 8 : 18, far * (indoor ? 1.05 : 0.95)); S.background = fogC.clone();
    // 光
    const hemiSky = col(indoor ? '#8a8098' : (P.sky ? P.sky[0] : '#bfe4ff')), hemiGround = col(P.ground ? P.ground[1] : '#2f7a2f');
    let hi = indoor ? 0.55 : 1.0, si = indoor ? 0.6 : 2.4; let sunC = col(place === 'volcano' || place === 'dark' ? '#ff7a4a' : place === 'desert' ? '#fff0c8' : '#fff6e8');
    if (night) { hi *= 0.45; si *= 0.3; sunC = col('#8a9ad8'); }
    if (place === 'dark') { hi *= 0.6; } if (place === 'sky') hi *= 1.15;
    S.add(new THREE.HemisphereLight(hemiSky, hemiGround, hi));
    const sun = new THREE.DirectionalLight(sunC, si); sun.position.set(-8, 14, 6); sun.target.position.set(0, 0, -2);
    if (this.quality === 'high') { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 14; sc.bottom = -10; sc.near = 1; sc.far = 60; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; }
    S.add(sun); S.add(sun.target); this.sun = sun;
    // 地面・地形・飾り
    this.buildGround(S, place, P, far, night);
    this.buildProps(S, place, P, night);
    // 粒（場所の粒＋演出の粒）
    const scale = (this.quality === 'high' ? 300 : 260) * this.pr;
    this.amb = new Particles(this.quality === 'high' ? 360 : 140, scale); S.add(this.amb.points);
    this.fxp = new Particles(this.quality === 'high' ? 1400 : 600, scale); S.add(this.fxp.points);
    this.ambKind = info.weather || ({ grassland: 'leaf', forest: 'firefly', cave: 'dust', mine: 'dust', castle: 'dust', harbor: 'spray', sea: 'spray', desert: 'sand', snow: 'snow', volcano: 'ember', magic_city: 'mote', machine_city: 'data', sky: 'wisp', dark: 'ash' })[place] || 'dust';
    this.ambCol = col(({ leaf: '#9fe08a', firefly: '#f0ff9a', dust: '#d8c8b8', spray: '#ffffff', sand: '#e8c890', snow: '#ffffff', ember: '#ff8a2a', mote: '#c9a2ff', data: '#6fd0ff', wisp: '#ffffff', ash: '#ff5a6a', rain: '#c8dcff' })[this.ambKind] || '#ffffff');
    // 演出の光（使い回し）
    this.fxLights = []; for (let i = 0; i < (this.quality === 'high' ? 3 : 1); i++) { const l = new THREE.PointLight(0xffffff, 0, 14, 1.4); S.add(l); this.fxLights.push(l); }
    // ボス：足もとの紋章と、ボスの色の光
    if (info.boss) { const bc = col('rgb(' + (info.bossColor || '255,60,80') + ')'); this.bossColor = bc;
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.45, 64), new THREE.MeshBasicMaterial({ color: bc, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.03, -0.2); S.add(ring);
      const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.5, 6), ring.material.clone()); ring2.rotation.x = -Math.PI / 2; ring2.position.set(0, 0.035, -0.2); S.add(ring2);
      this.anim.push((dt, t) => { ring.rotation.z = t * 0.25; ring2.rotation.z = -t * 0.4; ring.material.opacity = 0.45 + 0.25 * Math.sin(t * 2.4); });
      const bl = new THREE.PointLight(bc, 6, 12, 1.3); bl.position.set(0, 2.5, -1.5); S.add(bl); this.anim.push((dt, t) => { bl.intensity = 4 + 3 * Math.sin(t * 2.4); });
    }
    this.entrance = scene.entrance ? { dur: (scene.entrance.dur || 1400) / 1000, delay: (scene.entrance.delay || 0) / 1000 } : null;
    this.stats.builds++; this.stats.lastBuildMs = Math.round(performance.now() - t0); this.stats.place = place;
  }
  buildGround(S, place, P, far, night) {
    const water = place === 'sea' || place === 'harbor';
    const gw = 140, gd = far + 20; const geo = new THREE.PlaneGeometry(gw, gd, 120, 60); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 12 - gd / 2);
    const pos = geo.attributes.position; const cols = new Float32Array(pos.count * 3); const c0 = col(P.ground[0]), c1 = col(P.ground[1]); const tmp = new THREE.Color();
    const tint = { castle: ['#8a7a6a', '#4a3e34'], cave: ['#3a3036', '#1a141a'], mine: ['#5a4a3a', '#2a2018'], snow: ['#f4f8ff', '#c8d6ea'], volcano: ['#3a2a24', '#140c0a'], dark: ['#2e1c22', '#0c0608'], machine_city: ['#5a6272', '#22283a'], magic_city: ['#6a5a9a', '#2a1a4a'], sky: ['#f4f8ff', '#d0e0f4'], desert: ['#ecd09a', '#b88e56'], forest: ['#4a7a3a', '#1e3a1e'] }[place];
    if (tint) { c0.set(tint[0]); c1.set(tint[1]); }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); let y = 0; const n = h1(Math.floor(x * 1.3) * 7.1 + Math.floor(z * 1.3) * 3.3);
      const away = Math.max(0, Math.abs(x) - 8) + Math.max(0, -z - 14);   // 戦う場所（中央）は平ら、周りは起伏
      if (place === 'desert') y = Math.sin(x * 0.18 + z * 0.07) * 0.6 * Math.min(1, away / 6) + Math.sin(x * 0.05 - z * 0.11) * 1.2 * Math.min(1, away / 10);
      else if (place === 'snow' || place === 'grassland' || place === 'forest') y = (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.9 + n * 0.25) * Math.min(1, away / 5);
      else if (place === 'volcano' || place === 'dark') y = (n * 0.5 + Math.abs(Math.sin(x * 0.33 + z * 0.2)) * 0.9) * Math.min(1, away / 4);
      else if (place === 'cave' || place === 'mine') y = n * 0.25 * Math.min(1, away / 3);
      if (water) y = 0;
      pos.setY(i, y);
      const k = Math.min(1, Math.max(0, (z + far) / (far + 12))); tmp.copy(c0).lerp(c1, k);
      if (place === 'castle') { const ch = (Math.floor(x * 0.8) + Math.floor(z * 0.8)) & 1; tmp.multiplyScalar(ch ? 1 : 0.86); }
      else tmp.multiplyScalar(0.9 + n * 0.2);
      if (night) tmp.multiplyScalar(0.55);
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: place === 'castle' ? 0.55 : 0.95, metalness: place === 'machine_city' ? 0.35 : 0.0, flatShading: place === 'volcano' || place === 'dark' || place === 'cave' });
    const g = new THREE.Mesh(geo, mat); g.receiveShadow = true; S.add(g); this.ground = g;
    if (water) {   // 水面（波打つ）
      const wg = new THREE.PlaneGeometry(gw, gd, 90, 40); wg.rotateX(-Math.PI / 2); wg.translate(0, 0.02, 12 - gd / 2);
      const wm = new THREE.MeshStandardMaterial({ color: night ? 0x1a3a60 : 0x2a6ab0, roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.92, flatShading: true });
      const w = new THREE.Mesh(wg, wm); w.receiveShadow = true; S.add(w); const base = Float32Array.from(wg.attributes.position.array);
      if (place === 'harbor') { g.visible = false; }
      if (place === 'sea') g.visible = false;
      this.anim.push((dt, t) => { const a = wg.attributes.position; for (let i = 0; i < a.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; a.setY(i, 0.02 + Math.sin(x * 0.45 + t * 1.6) * 0.09 + Math.cos(z * 0.6 + t * 1.2) * 0.08); } a.needsUpdate = true; wg.computeVertexNormals(); });
    }
    if (place === 'sky') {   // 雲海：戦う場所の下に白い雲の床
      g.visible = false;
      const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x8090a8, emissiveIntensity: night ? 0.1 : 0.35 });
      const n = this.quality === 'high' ? 120 : 60; const ig = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), cm, n); const m4 = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { const x = (h1(i * 1.7) - 0.5) * 60, z = 6 - h1(i * 3.1) * (this.far + 4), s = 1.2 + h1(i * 5.3) * 2.6; m4.compose(new THREE.Vector3(x, -0.9 + h1(i) * 0.4, z), new THREE.Quaternion(), new THREE.Vector3(s * 1.6, s * 0.7, s)); ig.setMatrixAt(i, m4); }
      ig.receiveShadow = true; S.add(ig);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 6.5, 0.6, 40), new THREE.MeshStandardMaterial({ color: night ? 0x8a8070 : 0xd8cbb0, roughness: 0.8 })); plat.position.set(0, -0.3, 0.5); plat.receiveShadow = true; S.add(plat);
    }
  }
  /* 地形の飾り（インスタンスで軽く） */
  scatter(S, geo, mat, n, fn, shadow) {
    const im = new THREE.InstancedMesh(geo, mat, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
    for (let i = 0; i < n; i++) { const o = fn(i); if (!o) continue; e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(o.x, o.y || 0, o.z), q, new THREE.Vector3(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1)); im.setMatrixAt(k++, m4); if (o.c && im.setColorAt) im.setColorAt(k - 1, o.c); }
    im.count = k; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = !!shadow; im.receiveShadow = true; S.add(im); return im;
  }
  side(i, minX, maxX, zMin, zMax) { const sgn = h1(i * 9.7) < 0.5 ? -1 : 1; return { x: sgn * (minX + h1(i * 2.3) * (maxX - minX)), z: zMax - h1(i * 4.1) * (zMax - zMin) }; }
  light(S, color, x, y, z, inten, dist, flick) { const l = new THREE.PointLight(col(color), inten, dist || 8, 1.5); l.position.set(x, y, z); S.add(l); if (flick) this.anim.push((dt, t) => { l.intensity = inten * (0.8 + 0.2 * Math.sin(t * 9 + x) * Math.sin(t * 5.3 + z)); }); return l; }
  buildProps(S, place, P, night) {
    const hi = this.quality === 'high'; const dk = night ? 0.6 : 1;
    const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: col(c).multiplyScalar(dk), roughness: 0.9, flatShading: true }, o || {}));
    const glow = (c, i) => new THREE.MeshStandardMaterial({ color: col(c), emissive: col(c), emissiveIntensity: i || 1.6, roughness: 0.4 });
    const tree = (cLeaf, n, minX, zMin, snowy) => {
      const leaves = std(cLeaf), trunk = std('#5a3a22');
      const pick = (i) => { const p = this.side(i, minX, 22, zMin, 5); const s = 0.8 + h1(i * 7.7) * 0.9; return { x: p.x, z: p.z, s }; };
      this.scatter(S, new THREE.CylinderGeometry(0.12, 0.18, 1, 6).translate(0, 0.5, 0), trunk, n, (i) => { const o = pick(i); return { x: o.x, z: o.z, s: o.s }; }, true);
      this.scatter(S, new THREE.ConeGeometry(0.9, 2.2, 7).translate(0, 1.9, 0), leaves, n, (i) => { const o = pick(i); return { x: o.x, z: o.z, s: o.s, ry: i }; }, true);
      this.scatter(S, new THREE.ConeGeometry(0.7, 1.6, 7).translate(0, 2.8, 0), snowy ? std('#f4f8ff') : leaves, n, (i) => { const o = pick(i); return { x: o.x, z: o.z, s: o.s, ry: i * 2 }; }, true);
    };
    const rocks = (c, n, minX, zMin, big) => this.scatter(S, new THREE.DodecahedronGeometry(0.5, 0), std(c), n, (i) => { const p = this.side(i + 50, minX, 18, zMin, 5); const s = (big || 1) * (0.4 + h1(i * 3.9) * 0.9); return { x: p.x, z: p.z, y: s * 0.2, s, sy: s * 0.7, ry: i, rx: i * 0.3 }; }, true);
    const spikes = (c, n, minX, zMin, hgt) => this.scatter(S, new THREE.ConeGeometry(0.4, 1, 6).translate(0, 0.5, 0), std(c), n, (i) => { const p = this.side(i + 90, minX, 16, zMin, 4); return { x: p.x, z: p.z, s: 0.6 + h1(i) * 0.8, sy: (hgt || 2) * (0.5 + h1(i * 1.9)), rz: (h1(i * 4.4) - 0.5) * 0.3 }; }, true);
    const crystals = (c, n, minX, zMin, withLight) => { const m = glow(c, 1.2); m.transparent = true; m.opacity = 0.9; this.scatter(S, new THREE.OctahedronGeometry(0.35, 0), m, n, (i) => { const p = this.side(i + 130, minX, 12, zMin, 3); return { x: p.x, z: p.z, y: 0.4, s: 0.7 + h1(i) * 0.9, sy: 1.6 + h1(i * 2) * 1.6, ry: i }; }, false); if (withLight) { this.light(S, c, -5, 1.2, -3, 3, 7, true); this.light(S, c, 5.5, 1.2, -4, 3, 7, true); } };
    const pillars = (c, n, x, zStep, hgt, z0) => { const m = std(c, { roughness: 0.7 }); this.scatter(S, new THREE.CylinderGeometry(0.42, 0.48, 1, 12).translate(0, 0.5, 0), m, n * 2, (i) => ({ x: (i % 2 ? 1 : -1) * x, z: (z0 || 2) - Math.floor(i / 2) * zStep, sy: hgt }), true); this.scatter(S, new THREE.BoxGeometry(1.3, 0.35, 1.3).translate(0, 0.17, 0), m, n * 2, (i) => ({ x: (i % 2 ? 1 : -1) * x, z: (z0 || 2) - Math.floor(i / 2) * zStep, y: hgt - 0.1 }), true); };
    const torch = (x, z, c) => { const m = std('#5a3a22'); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), m); s.position.set(x, 0.7, z); s.castShadow = true; S.add(s); const f = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow(c || '#ffb24a', 3)); f.position.set(x, 1.5, z); S.add(f); this.light(S, c || '#ffa040', x, 1.7, z, hi ? 5 : 3, 8, true); };
    switch (place) {
      case 'grassland': tree(P.mid, hi ? 34 : 16, 7, -30); rocks('#8a8a7a', 14, 6, -26); this.scatter(S, new THREE.ConeGeometry(0.05, 0.22, 4).translate(0, 0.11, 0), std(P.ground[0], { roughness: 1 }), hi ? 260 : 100, (i) => ({ x: (h1(i * 1.1) - 0.5) * 30, z: 1.5 - h1(i * 2.7) * 24, ry: i }), false); break;
      case 'forest': tree(P.mid === '#3f8a3f' ? '#2a6a34' : P.mid, hi ? 70 : 30, 5, -34); tree(P.mid === '#3f8a3f' ? '#1e5028' : P.mid, hi ? 16 : 8, 9, -6); rocks('#6a7a5a', 10, 5, -20);
        if (!night) { const m = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 16, 12, 1, true), m); c.position.set(-6 + i * 4.2, 6, -6 - i * 2); c.rotation.z = 0.35; S.add(c); } } break;
      case 'cave': spikes('#3a3036', 26, 4.5, -16, 2.4); rocks('#4a3e44', 16, 4, -14, 1.4); crystals('#8ab8ff', 12, 3.5, -14, true); torch(-4.2, -1.5); torch(4.6, -2.5); break;
      case 'mine': rocks('#5a4636', 18, 4, -14, 1.3); crystals('#ffb070', 10, 3.5, -12, false); torch(-4.2, -1.2, '#ffb24a'); torch(4.4, -2.4, '#ffb24a');
        { const wood = std('#6a4a2a'); for (let i = 0; i < 3; i++) { const z = -2 - i * 5; [-3.8, 3.8].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), wood); b.position.set(x, 1.6, z); b.castShadow = true; S.add(b); }); const top = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.35), wood); top.position.set(0, 3.2, z); top.castShadow = true; S.add(top); }
          const rail = std('#8a8a8a', { metalness: 0.6, roughness: 0.4 }); [-0.5, 0.5].forEach((x) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 22), rail); r.position.set(x + 2.5, 0.04, -6); r.rotation.y = 0.15; S.add(r); }); } break;
      case 'castle': pillars(P.far === '#6a9ad0' ? '#9a94a8' : '#8a8498', 4, 5.2, 4.2, 4.2, 3);
        { const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 22), std('#8a1a2a', { roughness: 1 })); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.015, -5); carpet.receiveShadow = true; S.add(carpet);
          const ban = std('#a02a3a', { side: THREE.DoubleSide }); for (let i = 0; i < 3; i++) [-1, 1].forEach((sg) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), ban); b.position.set(sg * 4.6, 3.0, 1 - i * 4.2); b.rotation.y = -sg * Math.PI / 2; S.add(b); });
          [[-3.6, -0.5], [3.6, -0.5], [-3.6, -6], [3.6, -6]].forEach(([x, z]) => torch(x, z, '#ffb24a')); } break;
      case 'harbor': { const wood = std('#7a5a3a'); const pier = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 14), wood); pier.position.set(0, 0.12, -1); pier.receiveShadow = true; pier.castShadow = true; S.add(pier);
          this.scatter(S, new THREE.CylinderGeometry(0.16, 0.16, 2.4, 8).translate(0, -0.4, 0), wood, 12, (i) => ({ x: (i % 2 ? 1 : -1) * 4.4, z: 5 - Math.floor(i / 2) * 2.6 }), true);
          this.scatter(S, new THREE.BoxGeometry(0.9, 0.9, 0.9).translate(0, 0.45, 0), std('#9a7a4a'), 5, (i) => ({ x: -3.4 + (i % 2) * 0.95, z: 3 - i * 0.7, y: 0.27, ry: i * 0.4 }), true);
          const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 1.8), std('#6a4a2a')); hull.position.set(9, 0.5, -10); hull.castShadow = true; S.add(hull); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6), std('#5a3a22')); mast.position.set(9, 3.8, -10); S.add(mast);
          const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), std('#f0eee0', { side: THREE.DoubleSide })); sail.position.set(9.2, 4.2, -10); S.add(sail); this.anim.push((dt, t) => { hull.position.y = 0.5 + Math.sin(t * 1.1) * 0.08; hull.rotation.z = Math.sin(t * 0.9) * 0.03; }); } break;
      case 'sea': { const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 5), std('#7a5a3a')); deck.position.set(0, 0.1, 5.4); deck.receiveShadow = true; S.add(deck); const rail = std('#5a3a22'); const r = new THREE.Mesh(new THREE.BoxGeometry(14, 0.15, 0.15), rail); r.position.set(0, 0.9, 3.0); S.add(r);
          this.scatter(S, new THREE.BoxGeometry(0.12, 0.8, 0.12).translate(0, 0.4, 0), rail, 14, (i) => ({ x: -6.5 + i, z: 3.0, y: 0.25 }), true); this.anim.push((dt, t) => { this.rollY = Math.sin(t * 0.8) * 0.06; }); } break;
      case 'desert': rocks('#a07a4a', 12, 5, -24, 1.4); { const cm = std('#4a8a4a'); this.scatter(S, new THREE.CylinderGeometry(0.22, 0.26, 1.8, 8).translate(0, 0.9, 0), cm, 8, (i) => { const p = this.side(i + 300, 6, 18, -22, 3); return { x: p.x, z: p.z, s: 0.8 + h1(i) * 0.6 }; }, true); this.scatter(S, new THREE.CylinderGeometry(0.14, 0.16, 0.8, 8).translate(0, 0.4, 0), cm, 8, (i) => { const p = this.side(i + 300, 6, 18, -22, 3); const s = 0.8 + h1(i) * 0.6; return { x: p.x + 0.35 * s, z: p.z, y: 0.9 * s, s, rz: -0.6 }; }, true); } break;
      case 'snow': tree('#2e5048', hi ? 30 : 14, 6, -30, true); rocks('#c8d6ea', 12, 6, -24); crystals('#a8dcff', 8, 5, -18, false); break;
      case 'volcano': rocks('#2a1a16', 22, 4.5, -26, 1.6); spikes('#1a0e0c', 14, 6, -26, 3);
        { const lm = new THREE.MeshStandardMaterial({ color: 0x4a1000, emissive: 0xff5a10, emissiveIntensity: 1.6, roughness: 0.6 }); for (let i = 0; i < 5; i++) { const g = new THREE.PlaneGeometry(0.6 + h1(i) * 0.6, 26, 1, 20); const a = g.attributes.position; for (let j = 0; j < a.count; j++) a.setX(j, a.getX(j) + Math.sin(a.getY(j) * 0.35 + i) * 1.2); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, lm); m.position.set((i % 2 ? 1 : -1) * (5 + i * 1.6), 0.03, -10); S.add(m); }
          this.anim.push((dt, t) => { lm.emissiveIntensity = 1.4 + 0.4 * Math.sin(t * 1.7); }); this.light(S, '#ff6a20', -6, 1, -6, 6, 12, true); this.light(S, '#ff6a20', 7, 1, -9, 6, 12, true); } break;
      case 'magic_city': crystals('#c9a2ff', 14, 3.5, -22, true); { const m = std(P.far, { roughness: 0.6 }); const win = glow('#d8c0ff', 1.4); for (let i = 0; i < 8; i++) { const p = this.side(i + 400, 7, 20, -30, -6); const hgt = 4 + h1(i * 3) * 7; const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, hgt, 8), m); tw.position.set(p.x, hgt / 2, p.z); tw.castShadow = true; S.add(tw); const cap = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 8), m); cap.position.set(p.x, hgt + 1, p.z); S.add(cap); const wnd = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.05), win); wnd.position.set(p.x, hgt * 0.7, p.z + 1.0); S.add(wnd); }
          const rune = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.04, 6, 64), new THREE.MeshBasicMaterial({ color: 0xc9a2ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); rune.rotation.x = -Math.PI / 2; rune.position.set(0, 0.05, 0); S.add(rune); this.anim.push((dt, t) => { rune.rotation.z = t * 0.3; }); } break;
      case 'machine_city': { const m = std('#2a3242', { roughness: 0.5, metalness: 0.5 }); const ln = glow('#6fd0ff', 2.2); for (let i = 0; i < 12; i++) { const p = this.side(i + 500, 6.5, 22, -32, -4); const hgt = 3 + h1(i * 5) * 9, w = 1.4 + h1(i) * 1.6; const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, w), m); b.position.set(p.x, hgt / 2, p.z); b.castShadow = true; S.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.06, w * 1.02), ln); l.position.set(p.x, hgt * (0.3 + h1(i * 9) * 0.6), p.z); S.add(l); }
          this.scatter(S, new THREE.BoxGeometry(0.06, 0.02, 8), ln, 8, (i) => ({ x: (h1(i) - 0.5) * 14, z: -3 - h1(i * 2) * 10, y: 0.02, ry: (h1(i * 3) > 0.5 ? Math.PI / 2 : 0) }), false); this.light(S, '#6fd0ff', -5, 2, -4, 4, 10, false); this.light(S, '#6fd0ff', 5, 2, -6, 4, 10, false); } break;
      case 'sky': { const isl = std('#b8a890'); const top = std('#7ab06a'); for (let i = 0; i < 5; i++) { const p = this.side(i + 600, 8, 22, -40, -10); const s = 1 + h1(i * 2) * 2; const r = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 2.4 * s, 7), isl); r.rotation.x = Math.PI; r.position.set(p.x, 4 + h1(i) * 5, p.z); S.add(r); const tp = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * s, 1.6 * s, 0.3, 7), top); tp.position.set(p.x, r.position.y + 1.25 * s, p.z); S.add(tp); const y0 = r.position.y; this.anim.push((dt, t) => { r.position.y = y0 + Math.sin(t * 0.6 + i) * 0.25; tp.position.y = r.position.y + 1.25 * s; }); }
          pillars('#e8e0d0', 2, 6.2, 4.5, 3.2, 1.5); } break;
      case 'dark': spikes('#0e080a', 30, 4.5, -30, 3.4); rocks('#1a1014', 18, 4.5, -24, 1.4); this.light(S, '#c01a2a', 0, 3, -8, 6, 16, true);
        { const fm = new THREE.MeshBasicMaterial({ color: 0xa01a3a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }); const fog = new THREE.Mesh(new THREE.PlaneGeometry(60, 3), fm); fog.position.set(0, 0.6, -8); S.add(fog); this.anim.push((dt, t) => { fm.opacity = 0.14 + 0.06 * Math.sin(t * 0.7); }); } break;
      default: break;
    }
  }
  /* ---------- 毎フレーム ---------- */
  update(dt, t, scene, W, H) {
    this.anim.forEach((fn) => fn(dt, t));
    // カメラ：ゆっくり揺れる。ボスの登場は引き→寄り。命中の揺れ
    const cb = this.camBase; let ex = 0, ey = 0, ez = 0;
    if (this.entrance) { const e = this.entrance; const k = Math.max(0, Math.min(1, (t - e.delay) / e.dur)); const s = 1 - Math.pow(1 - k, 3); ey = (1 - s) * 1.6; ez = (1 - s) * 5; if (k >= 1) this.entrance = null; }
    this.shake = Math.max(0, this.shake - dt * 2.2); const sh = this.shake * this.shake;
    this.camera.position.set(cb.x + Math.sin(t * 0.21) * 0.35 + (Math.random() - 0.5) * sh * 0.25, cb.y + ey + Math.sin(t * 0.33) * 0.05 + (Math.random() - 0.5) * sh * 0.18 + (this.rollY || 0), cb.z + ez);
    this.camera.rotation.set(-this.pitch - ey * 0.04, Math.sin(t * 0.21) * 0.012, (this.rollY || 0) * 0.15, 'YXZ');
    this.camera.updateMatrixWorld();
    this.ambient(dt, t);
    // 演出の予定
    const now = performance.now();
    this.fxq = this.fxq.filter((q) => { if (now < q.at) return true; try { q.fn(); } catch (e) { console.warn('3D FX', e); } return false; });
    this.fxLights.forEach((l) => { if (l._until && now > l._until) { l.intensity = Math.max(0, l.intensity - dt * 40); if (l.intensity <= 0) l._until = 0; } });
    this.meshFx = this.meshFx.filter((m) => { m.t += dt; const f = m.t / m.life; if (f >= 1) { this.scene3.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); return false; } m.step(f, m.mesh); return true; });
    this.fxp.update(dt);
  }
  ambient(dt, t) {
    const A = this.amb, k = this.ambKind, c = this.ambCol; const want = A.n; let tries = 0;
    while (A.p.length < want && tries++ < 12) {
      const x = (Math.random() - 0.5) * 26, z = 6 - Math.random() * 26; const o = { x, y: 0, z, vx: 0, vy: 0, vz: 0, t: 0, life: 4 + Math.random() * 4, c, s: 0.06, a: 0.8 };
      if (k === 'snow' || k === 'ash') { o.y = 5 + Math.random() * 3; o.vy = -(0.6 + Math.random() * 0.6); o.vx = 0.3 * (Math.random() - 0.3); o.s = k === 'snow' ? 0.09 : 0.06; o.life = 9; }
      else if (k === 'rain') { o.y = 6; o.vy = -12; o.vx = -1; o.s = 0.05; o.life = 0.7; o.a = 0.5; }
      else if (k === 'sand') { o.y = Math.random() * 1.5; o.vx = 3 + Math.random() * 2; o.vy = 0.1; o.s = 0.05; o.x -= 8; }
      else if (k === 'ember') { o.y = 0.1; o.vy = 0.6 + Math.random() * 0.8; o.vx = 0.2 * (Math.random() - 0.5); o.s = 0.08; }
      else if (k === 'data') { o.y = 0; o.vy = 1 + Math.random() * 1.2; o.s = 0.06; }
      else if (k === 'firefly' || k === 'mote') { o.y = 0.3 + Math.random() * 2.2; o.vx = 0.2 * (Math.random() - 0.5); o.vy = 0.1 * (Math.random() - 0.5); o.s = 0.1; }
      else if (k === 'leaf') { o.y = 3 + Math.random() * 2; o.vy = -0.4; o.vx = 0.8; o.s = 0.08; }
      else if (k === 'spray') { o.y = 0.1; o.vy = 0.8 + Math.random(); o.g = 2; o.s = 0.06; o.life = 1.2; }
      else if (k === 'wisp') { o.y = -0.4 + Math.random() * 0.6; o.vx = 0.4; o.s = 0.3; o.a = 0.25; }
      else { o.y = Math.random() * 3; o.vx = 0.08 * (Math.random() - 0.5); o.vy = 0.05; o.s = 0.05; o.a = 0.5; }
      A.add(o);
    }
    A.update(dt);
  }
  /* ---------- 演出（2D版と同じ時刻表） ---------- */
  posKey(key) {   // 2D版の画面上の位置 → 3D（敵は z=0 の面、味方は手前 z=3.4 の面）
    const sc = this.lastScene; if (!sc || !sc.posOf) return null; const W = this.cw || 640, H = this.ch || 416; const p = sc.posOf(key, W, H); if (!p) return null;
    const ndc = new THREE.Vector2(p.x / W * 2 - 1, -(p.y / H * 2 - 1)); const rc = this._rc || (this._rc = new THREE.Raycaster()); rc.setFromCamera(ndc, this.camera);
    const z = /^p:/.test(key) ? 3.4 : 0; const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z); const out = new THREE.Vector3(); if (!rc.ray.intersectPlane(plane, out)) return null; out.y = Math.max(0.3, out.y); return out;
  }
  onFx(d) {
    if (!this.scene3 || !this.lastScene || this.lastScene !== (G.BattleUI && G.BattleUI.scene)) return;
    const def = d.def || {}, tl = d.tl || {}; const fam = familyOf(def.fx); const c1 = col(def.color || '#ffffff'), c2 = col(def.color2 || def.color || '#ffd24a');
    const from = this.posKey(d.from); const tos = (d.to || []).map((k) => this.posKey(k)).filter(Boolean); if (!tos.length) return;
    const now = performance.now(); const big = !!def.big || ['meteor', 'time_stop', 'trend_break', 'explosion', 'aurora'].indexOf(def.fx) >= 0; const area = def.area === 'all' || tos.length > 1;
    this.stats.fx++; this.stats.lastFx = fam;
    const at = (ms, fn) => this.fxq.push({ at: now + ms, fn });
    // 構え：使う人の足もとの光
    if (from) at(0, () => { this.flash(from, c2, big ? 8 : 4, (tl.windup || 200) + 120); this.burst(from, c2, 14, 1.2, { up: 1.5, s: 0.08 }); });
    if (fam === 'travel' && from) { const tr = tl.travel || 300; tos.forEach((p) => { const steps = 10; for (let i = 0; i <= steps; i++) at((tl.windup || 0) + tr * i / steps * 0.98, () => { const q = from.clone().lerp(p, i / steps); q.y += Math.sin(i / steps * Math.PI) * 0.6; this.burst(q, i % 2 ? c1 : c2, 4, 0.3, { s: 0.16, life: 0.4 }); }); }); }
    if (fam === 'rain') tos.forEach((p, j) => { for (let i = 0; i < 10; i++) at(Math.max(0, (tl.hitAt || 300) - 260) + i * 18 + j * 10, () => { this.fxp.add({ x: p.x + (Math.random() - 0.5) * 1.6, y: p.y + 5, z: p.z + (Math.random() - 0.5) * 1.2, vx: 0, vy: -18, vz: 0, t: 0, life: 0.32, c: i % 2 ? c1 : c2, s: def.fx === 'meteor' ? 0.5 : 0.18, grow: 0.2 }); }); });
    const nowD = Date.now(); this.log = this.log || [];
    (tl.impacts && tl.impacts.length ? tl.impacts : [tl.hitAt || 300]).forEach((ms, k) => { const rec = { fx: def.fx, k, plan: nowD + ms, done: 0 }; this.log.push(rec); if (this.log.length > 300) this.log.shift(); at(ms, () => {
      rec.done = Date.now();
      tos.forEach((p) => this.impact(fam, p, c1, c2, big, k));
      if (area) this.shock(tos.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / tos.length), c1, big ? 6 : 4);
      this.shake = Math.min(1, this.shake + (big ? 0.7 : fam === 'strike' ? 0.25 : 0.15));
    }); });
  }
  flash(p, c, inten, ms) { const l = this.fxLights.find((x) => !x._until) || this.fxLights[0]; if (!l) return; l.color.copy(c); l.position.set(p.x, p.y + 0.8, p.z + 0.8); l.intensity = inten * (this.quality === 'high' ? 1 : 0.8); l._until = performance.now() + ms; }
  burst(p, c, n, sp, o) { o = o || {}; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = (Math.random() - 0.3) * Math.PI * 0.6, v = sp * (0.4 + Math.random()); this.fxp.add({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * Math.cos(e) * v, vy: Math.sin(e) * v + (o.up || 0), vz: Math.sin(a) * Math.cos(e) * v * 0.6, g: o.g || 0, drag: 1.5, t: 0, life: (o.life || 0.6) * (0.6 + Math.random() * 0.6), c, s: o.s || 0.12 }); } }
  shock(p, c, r) { const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.06, p.z); this.scene3.add(m); this.meshFx.push({ mesh: m, t: 0, life: 0.55, step: (f, mm) => { const s = 1 + f * r; mm.scale.set(s, s, s); mm.material.opacity = 0.8 * (1 - f); } }); }
  column(p, c, hgt, w) { const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w, hgt, 16, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.set(p.x, hgt / 2, p.z); this.scene3.add(m); this.meshFx.push({ mesh: m, t: 0, life: 0.5, step: (f, mm) => { mm.material.opacity = 0.6 * (1 - f); mm.scale.set(1 - f * 0.6, 1, 1 - f * 0.6); } }); }
  candles(p, c1, c2) { for (let i = 0; i < 6; i++) { const up = i % 3 !== 1; const hgt = 0.5 + h1(i * 3 + p.x) * 1.4; const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, hgt, 0.22), new THREE.MeshBasicMaterial({ color: up ? 0x3ad08a : 0xff4a5a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); const x = p.x - 1.4 + i * 0.56, base = 0.3 + i * 0.25 * (up ? 1 : 0.6); m.position.set(x, base, p.z - 0.6); this.scene3.add(m); this.meshFx.push({ mesh: m, t: 0, life: 0.9, step: (f, mm) => { const k = Math.min(1, f * 4); mm.scale.y = Math.max(0.01, k); mm.position.y = base + hgt * k / 2; mm.material.opacity = 0.85 * (f > 0.6 ? (1 - f) / 0.4 : 1); } }); } this.burst(p, c2, 16, 2.2, { s: 0.12 }); }
  impact(fam, p, c1, c2, big, k) {
    const hiQ = this.quality === 'high'; const n = (big ? 46 : 24) * (hiQ ? 1 : 0.5) | 0;
    this.flash(p, c1, big ? 10 : 5, 260);
    switch (fam) {
      case 'strike': this.burst(p, c2, n, 3.6, { s: 0.09, life: 0.35 }); this.burst(p, c1, n / 2 | 0, 2.2, { s: 0.14 }); break;
      case 'column': this.column(p, c1, 9, big ? 0.9 : 0.55); this.burst(p, c2, n, 2.6, { up: 1, s: 0.12 }); break;
      case 'swirl': for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = 0.6 + Math.random() * 1.2; this.fxp.add({ x: p.x + Math.cos(a) * r, y: 0.2 + Math.random() * 2.2, z: p.z + Math.sin(a) * r, cx: p.x, cz: p.z, swirl: 5, vx: 0, vy: 0.6, vz: 0, t: 0, life: 0.9, c: i % 2 ? c1 : c2, s: 0.13 }); } break;
      case 'ring': this.shock(p, c1, 3.5); this.shock(p, c2, 2); this.burst(p, c2, n / 2 | 0, 1.4, { s: 0.1 }); break;
      case 'rise': for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = Math.random() * 0.8; this.fxp.add({ x: p.x + Math.cos(a) * r, y: 0.1, z: p.z + Math.sin(a) * r, vx: 0, vy: 1.4 + Math.random() * 1.8, vz: 0, t: 0, life: 0.9, c: i % 2 ? c1 : c2, s: 0.11 }); } this.shock(new THREE.Vector3(p.x, 0, p.z), c1, 1.6); break;
      case 'sink': for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = 0.4 + Math.random() * 0.9; this.fxp.add({ x: p.x + Math.cos(a) * r, y: 2.4, z: p.z + Math.sin(a) * r, vx: 0, vy: -1.6 - Math.random(), vz: 0, t: 0, life: 0.8, c: i % 3 ? c1 : col('#2a0a3a'), s: 0.13 }); } break;
      case 'chart': if (k === 0) this.candles(p, c1, c2); else this.burst(p, c2, n, 2.4, { s: 0.1 }); break;
      case 'rain': this.burst(p, c1, n, 3, { up: 1.2, s: 0.14 }); this.shock(p, c2, 2.2); break;
      default: this.burst(p, c1, n, 3.2, { up: 0.6, s: 0.15 }); this.burst(p, c2, n / 2 | 0, 1.8, { s: 0.22, life: 0.8 }); if (big) this.shock(p, c1, 4); break;
    }
  }
  dispose() {
    if (!this.scene3) return;
    this.scene3.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map && m.map !== this.backTex) m.map.dispose(); m.dispose(); }); });
    if (this.backTex) { this.backTex.dispose(); this.backTex = null; }
    this.scene3 = null;
  }
}
