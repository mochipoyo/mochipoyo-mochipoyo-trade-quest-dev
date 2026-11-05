/* =========================================================
   LightingManager：太陽・空・霧・昼夜・窓明かり・ランタンの点光源（近い順に数を限って使い回す）
   時間帯は既存の State.data.timeOfDay（0=深夜 0.25=朝 0.5=昼 0.75=夕）。表示だけを切り替える「プレビュー」も可
   ========================================================= */
import * as THREE from 'three';
import { SPACE_GLSL } from '../environment/Space76.js';

const KEYS = [   // t, 太陽の色・強さ, 空（上・地平）, 霧, 半球光, 窓, 露出
  { t: 0.0, sun: 0x8a9ad0, si: 0.72, top: 0x14204a, hor: 0x2c3a64, fog: 0x232c4c, hemi: 0x7a8cc4, hi: 0.66, win: 2.6, exp: 1.16 },   // v6.6 夜：月明かりで地形・道が見える明るさに（以前は si 0.35・hi 0.35・露出 1.05）
  { t: 0.22, sun: 0xff9a5a, si: 1.0, top: 0x3a5a9a, hor: 0xf0a070, fog: 0xc8a088, hemi: 0xa8b0d0, hi: 0.6, win: 1.2, exp: 1.0 },
  { t: 0.32, sun: 0xfff0d8, si: 2.6, top: 0x5a96d8, hor: 0xcfe2f0, fog: 0xb8cce0, hemi: 0xcfe0ff, hi: 1.0, win: 0.15, exp: 1.0 },
  { t: 0.5, sun: 0xfff6e8, si: 2.9, top: 0x4a8ad8, hor: 0xd4e6f4, fog: 0xc0d4e8, hemi: 0xd8e6ff, hi: 1.05, win: 0.1, exp: 1.0 },
  { t: 0.68, sun: 0xffd8a8, si: 2.2, top: 0x5a86c8, hor: 0xf0d0a8, fog: 0xd8c0a0, hemi: 0xe0d0c0, hi: 0.9, win: 0.4, exp: 1.0 },
  { t: 0.78, sun: 0xff7a3a, si: 1.1, top: 0x2a3a78, hor: 0xe8784a, fog: 0x8a5a58, hemi: 0x9a8aa8, hi: 0.62, win: 1.8, exp: 1.08 },
  { t: 0.86, sun: 0x8a96d0, si: 0.74, top: 0x16224c, hor: 0x363866, fog: 0x272a4c, hemi: 0x7a8ac0, hi: 0.66, win: 2.6, exp: 1.16 },
  { t: 1.0, sun: 0x8a9ad0, si: 0.72, top: 0x14204a, hor: 0x2c3a64, fog: 0x232c4c, hemi: 0x7a8cc4, hi: 0.66, win: 2.6, exp: 1.16 }
];
const cA = new THREE.Color(), cB = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), vX = new THREE.Vector3(), vY = new THREE.Vector3(), vT = new THREE.Vector3();
function lerpKey(t) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++;
  const a = KEYS[i], b = KEYS[i + 1]; const k = Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t)));
  const col = (x, y) => cA.setHex(x).lerp(cB.setHex(y), k).getHex();
  const num = (x, y) => x + (y - x) * k;
  return { sun: col(a.sun, b.sun), si: num(a.si, b.si), top: col(a.top, b.top), hor: col(a.hor, b.hor), fog: col(a.fog, b.fog), hemi: col(a.hemi, b.hemi), hi: num(a.hi, b.hi), win: num(a.win, b.win), exp: num(a.exp, b.exp) };
}

export class LightingManager {
  constructor(scene, renderer, quality) {
    this.scene = scene; this.renderer = renderer; this.quality = quality;
    this.hemi = new THREE.HemisphereLight(0xd8e6ff, 0x4a5a3a, 1.0); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff6e8, 2.8);
    this.sun.castShadow = true; const sm = quality === 'high' ? 2048 : 1024; this.sun.shadow.mapSize.set(sm, sm);
    const sc = this.sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 120;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 3;
    scene.add(this.sun); scene.add(this.sun.target);
    this.fog = new THREE.FogExp2(0xc0d4e8, 0.012); scene.fog = this.fog;
    this.sky = this.makeSky(); scene.add(this.sky);
    this.lampLights = [];
    const n = quality === 'high' ? 8 : 4;
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffb05a, 0, 9, 1.6); l.castShadow = false; scene.add(l); this.lampLights.push(l); }
    // v6.6 点光源の割り当て（スロットごと：照らしている街灯・明るさ 0..1）。近い街灯が入れ替わるときは、ふっと消えて／ふっと点く（チラつき対策）
    this.slots = this.lampLights.map(() => ({ spot: null, lv: 0 })); this._lampT = 0;
    this.lampSpots = []; this.windowMats = new Set(); this.glowMats = new Set(); this.nightMats = new Set(); this.dayMats = new Set(); this.night = 0; this.preview = null; this.interior = false;
  }
  makeSky() {
    const g = new THREE.SphereGeometry(400, 32, 16);
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x4a8ad8) }, hor: { value: new THREE.Color(0xd4e6f4) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xffffff) }, space: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vP; varying vec3 vW; void main(){ vP = normalize(position); vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float space; uniform float uT; varying vec3 vP; varying vec3 vW;\n' + SPACE_GLSL + '\nvoid main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); vec3 c = mix(hor, top, pow(h,0.7)); float s = max(dot(normalize(vP), normalize(sunDir)),0.0); c += sunCol*pow(s,64.0)*0.8 + sunCol*pow(s,6.0)*0.12; if (space > 0.5) c = space76sky(vW - cameraPosition, uT); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}'
    });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = -10; mesh.frustumCulled = false; return mesh;
  }
  // 建物の窓・ランタンなど「光る」マテリアルを登録（夜に強くする）
  registerScene(root) {
    root.traverse((o) => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.userData && m.userData.nightGlow !== undefined) { this.nightMats.add(m); return; }
        if (m.userData && m.userData.dayGlow !== undefined) { this.dayMats.add(m); return; }   // v7.6 昼だけ（屋内の窓の光の帯・窓のガラス）
        if (m.userData && m.userData.keepGlow) return;   // v7.0 場所の飾りの光る部分（画面・水晶など）：昼も夜も同じ明るさ   // v6.6 町明かりのにじみ（夜だけ）
        if (m.userData && m.userData.window) this.windowMats.add(m);
        else if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05 && m.emissiveIntensity > 0) { if (m.userData.baseEmissive === undefined) m.userData.baseEmissive = m.emissiveIntensity; this.glowMats.add(m); }
      });
    });
  }
  setLampSpots(spots) { this.lampSpots = spots; if (this.slots) this.slots.forEach((sl) => { sl.spot = null; sl.lv = 0; }); }
  // 地域テーマ（themes.js）：霧・地平の色を地域の色へ寄せ、暗い地域は日差しを弱める
  setTheme(theme) { this.theme = theme || null; this._fogC = theme && theme.fog ? new THREE.Color(theme.fog) : null; }
  setInterior(on, ambient) { this.interior = on; this.ambient = ambient || null; }
  setMapKind(k) { this.mapKind = k || null; }   // v7.6 画面の仕上げのぼかしの強さ（field/town/dungeon/interior）
  // v6.9 マップ固有の空気（2D のマップ定義 def.mood3d）：襲撃の夜のアサナ村など。時間帯の色の代わりに使う（屋外だけ）
  setMood(m) { this.mood = m || null; }
  // v7.6 異空間（ゼロメア）のフィールド：空を星空に・霧を暗い紫に（Space76.js）
  setSpace(on) { this.space = !!on; }
  update(t, focus) {
    const tt = this.preview !== null ? this.preview : (t === undefined ? 0.35 : t);
    const k = lerpKey(((tt % 1) + 1) % 1);
    if (this.mood && !this.interior) Object.assign(k, this.mood);
    this.night = Math.max(0, Math.min(1, (k.win - 0.3) / 2.2));
    // 太陽の向き：朝は東、夕は西、夜は月（青白い弱い光）
    const ang = (tt - 0.25) * Math.PI * 2; const el = Math.max(0.35, Math.sin((tt - 0.25) * Math.PI * 2 + Math.PI / 2) * 0.9 + 0.2);
    const dir = new THREE.Vector3(Math.cos(ang) * 0.8 + 0.25, Math.max(0.45, el), 0.55).normalize();
    const f = focus || new THREE.Vector3();
    // v6.6 影の映る範囲を、影のテクスチャの1画素ぶんずつ動かす（光の向きから見た縦横で丸める。歩くたびに影のふちがチラチラしないように）
    const texel = 44 / this.sun.shadow.mapSize.x;
    vX.crossVectors(UP, dir).normalize(); vY.crossVectors(dir, vX);
    const a = Math.round(f.dot(vX) / texel) * texel - f.dot(vX), b = Math.round(f.dot(vY) / texel) * texel - f.dot(vY);
    vT.copy(f).addScaledVector(vX, a).addScaledVector(vY, b);
    this.sun.position.copy(vT).addScaledVector(dir, 50); this.sun.target.position.copy(vT);
    this.sun.color.setHex(k.sun); this.sun.intensity = this.interior ? k.si * 0.25 : k.si;
    this.hemi.color.setHex(k.hemi); this.hemi.groundColor.setHex(0x4a4a3a); this.hemi.intensity = this.interior ? Math.max(0.55, k.hi * 0.8) * (this.ambient ? 0.7 + this.ambient * 0.8 : 1) : k.hi;
    this.fog.color.setHex(this.interior ? 0x1a140e : k.fog); this.fog.density = this.interior ? 0.0 : (this.mood && this.mood.fogD ? this.mood.fogD : (0.010 + this.night * 0.004));   // v6.6 夜の霧を薄く（以前は +0.01）
    const th = this.theme; let skyHor = null;
    if (th && !this.interior) {
      if (this._fogC) { this.fog.color.lerp(this._fogC, 0.55 * (1 - this.night * 0.6)); skyHor = this._fogC; }
      if (th.dim) { this.sun.intensity *= th.dim; this.hemi.intensity *= 0.6 + th.dim * 0.4; }
    }
    this.sky.visible = !this.interior;
    this.sky.material.uniforms.top.value.setHex(k.top); this.sky.material.uniforms.hor.value.setHex(k.hor);
    if (skyHor) { this.sky.material.uniforms.hor.value.lerp(skyHor, 0.5); if (th.dim) this.sky.material.uniforms.top.value.lerp(skyHor, 0.35).multiplyScalar(0.6 + th.dim * 0.4); } this.sky.material.uniforms.sunDir.value.copy(dir); this.sky.material.uniforms.sunCol.value.setHex(k.sun);
    this.sky.position.copy(f);
    this.sky.material.uniforms.space.value = this.space && !this.interior ? 1 : 0;
    if (this.space && !this.interior) { this.sky.material.uniforms.uT.value = performance.now() / 1000; this.fog.color.setHex(0x120e26); this.fog.density = 0.006; this.hemi.color.lerp(new THREE.Color(0xb8a8ff), 0.35); }   // v7.6 異空間
    this.scene.background = null;
    this.renderer.renderer.toneMappingExposure = k.exp;
    for (const m of this.windowMats) m.emissiveIntensity = this.interior ? 0.6 : k.win;
    for (const m of this.glowMats) m.emissiveIntensity = (m.userData.baseEmissive || 1) * (this.interior ? 0.6 : 0.25 + this.night * 0.9);
    const nk = this.interior ? 0 : Math.max(0, Math.min(1, (this.night - 0.15) / 0.6)); for (const m of this.nightMats) { m.opacity = m.userData.nightGlow * nk * nk * (3 - 2 * nk); m.visible = m.opacity > 0.004; }
    this.renderer.setBloom(0.25 + this.night * 0.6);
    { const day = 1 - this.night; for (const m of this.dayMats) { if (m.userData.dayEmissive !== undefined) { m.emissiveIntensity = m.userData.dayEmissive * (0.12 + 0.88 * day); if (m.color && m.userData.dayCol === undefined) m.userData.dayCol = m.color.getHex(); if (m.color) m.color.setHex(m.userData.dayCol).multiplyScalar(0.35 + 0.65 * day); } else { m.opacity = m.userData.dayGlow * day * day; m.visible = m.opacity > 0.004; } } }   // v7.6 窓の光（昼）
    if (this.renderer.setFinish) {   // v7.6 画面の仕上げ（Finish76.js）：地域・時間帯・屋内で色の調子とぼかしを変える
      const ti = ((tt % 1) + 1) % 1; const dusk = this.mood ? 0 : Math.max(0, 1 - Math.abs(ti - 0.76) / 0.08) + 0.6 * Math.max(0, 1 - Math.abs(ti - 0.23) / 0.07);
      const kind = this.mapKind === 'interior' ? 'interior' : (this.mapKind || 'town');
      this.renderer.setFinish({ theme: this.theme, night: this.interior ? 0 : this.night, dusk: this.interior ? 0 : Math.min(1, dusk), interior: kind === 'interior', kind });
    }
    // 近いランタンだけ点光源で照らす（夜・屋内）
    // v6.6 チラつき対策：以前は毎フレーム「近い順の N 個」へ点光源を付け替えていたため、歩くと N 番目あたりの街灯が一瞬で点いたり消えたりした。
    //   いまは照らしている街灯をスロットに保持し、近い N+2 個から外れたときだけ 0.35 秒かけて消し、空いたスロットで新しい街灯を 0.35 秒かけて点ける
    const lampOn = this.interior ? 1 : this.night;
    const now = performance.now(); const dt = this._lampT ? Math.min(0.1, Math.max(0, (now - this._lampT) / 1000)) : 0.016; this._lampT = now;
    const N = this.lampLights.length; const FADE = dt / 0.35;
    const spots = lampOn < 0.05 ? [] : this.lampSpots.slice().sort((a, b) => a.pos.distanceToSquared(f) - b.pos.distanceToSquared(f));
    const keep = new Set(spots.slice(0, N + 2)), want = spots.slice(0, N);
    const held = new Set(); this.slots.forEach((sl) => { if (sl.spot && keep.has(sl.spot)) held.add(sl.spot); });
    this.slots.forEach((sl) => {
      if (sl.spot && !keep.has(sl.spot)) { sl.lv -= FADE; if (sl.lv <= 0) { sl.lv = 0; sl.spot = null; } }   // 遠くなった：ふっと消える
      else if (sl.spot) sl.lv = Math.min(1, sl.lv + FADE);
    });
    for (const s of want) {
      if (held.has(s)) continue;
      const free = this.slots.find((sl) => !sl.spot); if (!free) break;
      free.spot = s; free.lv = 0; held.add(s);   // 近づいた：空いたスロットでふっと点く
    }
    this.lampLights.forEach((l, i) => {
      const sl = this.slots[i]; const s = sl.spot;
      if (!s || lampOn < 0.05 || sl.lv <= 0) { l.intensity = 0; return; }
      const e = sl.lv * sl.lv * (3 - 2 * sl.lv);
      l.position.copy(s.pos); l.color.setHex(s.color || 0xffb05a); l.intensity = (s.power || 1) * (this.interior ? 6 : 10) * lampOn * e; l.distance = s.dist || 9;
    });
  }
}
